#!/usr/bin/python

import sys
import os
import time
import json
import yaml
import requests
import datetime

## constants
MARKETPLACE_URL = "https://api.github.com/repos/egeoffrey/egeoffrey-marketplace/contents/marketplace"
MARKETPLACE_BRANCH = "master"
SCHEMA_VERSION = 1
OUTPUT_FILE = os.path.dirname(os.path.realpath(__file__))+"/../cache/marketplace_cache.json"
SUPPORTED_MANIFEST_SCHEMA = 2
STRFTIME = "%d/%m/%Y %H:%M:%S"

# marketplace data structure
marketplace = {
    "schema_version": SCHEMA_VERSION,
    "packages": {}
}

# issue a web request
def web_request(url):
    try: 
        username = os.getenv("GITHUB_USERNAME", None)
        password = os.getenv("GITHUB_PASSWORD", None)
        auth = None
        if username is not None and password is not None: 
            auth = requests.auth.HTTPBasicAuth(username, password)
        response = requests.get(url, auth=auth)
        if response.status_code != 200: 
            raise Exception(str(response.status_code)+": "+response.content)
        return response.content
    except Exception,e:
        raise Exception("Unable to get content from "+url+": "+str(e))

# get the list of all items in the marketplace
print("Listing Marketplace items...")
try:
    # list all files in the marketplace database
    response = web_request(MARKETPLACE_URL+"?ref="+MARKETPLACE_BRANCH)
    content = json.loads(response)
    print("Marketplace has "+str(len(content))+" entries")
    # for each package in the marketplace
    for item in content:
        # skip invalid entries
        if "path" not in item or "name" not in item: 
            continue
        # build the package name
        package = item["name"].replace(".yml", "")
        try: 
            # download the marketplace item which contains the github repo reference
            response = web_request("https://raw.githubusercontent.com/egeoffrey/egeoffrey-marketplace/"+MARKETPLACE_BRANCH+"/marketplace/"+package+".yml?timestamp="+str(int(time.time())))
            content = yaml.load(response, Loader=yaml.SafeLoader)
            if "github" not in content: 
                continue
            repository = content["github"]
            print("Package "+package+" is in repository "+repository)
            marketplace["packages"][package] = {}
            marketplace["packages"][package]["info"] = {}
            marketplace["packages"][package]["branches"] = {}
            # retrieve repository additional info
            try:
                response = web_request("https://api.github.com/repos/"+repository)
                content = json.loads(response)
                time_object = datetime.datetime.strptime(content["created_at"], "%Y-%m-%dT%H:%M:%SZ")
                timestamp = int(time.mktime(time_object.timetuple()))
                marketplace["packages"][package]["info"]["created_timestamp"] = timestamp
                marketplace["packages"][package]["info"]["created_string"] = time_object.strftime(STRFTIME)
                marketplace["packages"][package]["info"]["created_days_ago"] = int((time.time() - timestamp)/3600/24)
                split = repository.split("/")
                marketplace["packages"][package]["info"]["author"] = split[0]
                marketplace["packages"][package]["info"]["repository"] = repository
            except Exception,e:
                print("WARNING: unable to retrieve info for repository "+repository+": "+str(e))
                continue
            # list available branches in the repository
            try: 
                response = web_request("https://api.github.com/repos/"+repository+"/branches")
                content = yaml.load(response, Loader=yaml.SafeLoader)
                for item in content:
                    branch = item["name"]
                    marketplace["packages"][package]["branches"][branch] = {}
                    marketplace["packages"][package]["branches"][branch]["info"] = {}
                    marketplace["packages"][package]["branches"][branch]["manifest"] = {}
                    # retrieve branch additional information
                    try:
                        response = web_request("https://api.github.com/repos/"+repository+"/branches/"+branch)
                        content = json.loads(response)
                        time_object = datetime.datetime.strptime(content["commit"]["commit"]["committer"]["date"], "%Y-%m-%dT%H:%M:%SZ")
                        timestamp = int(time.mktime(time_object.timetuple()))
                        marketplace["packages"][package]["branches"][branch]["info"]["updated_timestamp"] = timestamp
                        marketplace["packages"][package]["branches"][branch]["info"]["updated_string"] = time_object.strftime(STRFTIME)
                        marketplace["packages"][package]["branches"][branch]["info"]["updated_days_ago"] = int((time.time() - timestamp)/3600/24)
                    except Exception,e:
                        print("WARNING: unable to retrieve branch info for "+repository+":"+branch+": "+str(e))
                        continue
                    # download the manifest from the remote repository
                    try:
                        response = web_request("https://raw.githubusercontent.com/"+repository+"/"+branch+"/manifest.yml?timestamp="+str(int(time.time())))
                        manifest = yaml.load(response, Loader=yaml.SafeLoader)
                    except Exception,e:
                        print("WARNING: skipping package "+package+":"+branch+": "+str(e))
                        continue
                    if manifest["manifest_schema"] != SUPPORTED_MANIFEST_SCHEMA:
                        print("WARNING: Skipping package "+package+" because manifest v"+str(manifest["manifest_schema"])+" is not supported")
                        continue
                    # add the item to the marketplace data structure
                    marketplace["packages"][package]["branches"][branch]["manifest"] = manifest
                    print("\tAdded manifest from branch "+branch)
            except Exception,e:
                print("ERROR: Unable to list available branches for package "+package+": "+str(e))
                continue
        except Exception,e:
            print("ERROR: Unable to retrieve github repository for package "+package+": "+str(e))
            continue
except Exception,e:
    print("ERROR: Unable to list marketplace items: "+str(e))

# write the cache to disk
marketplace["last_update_timestamp"] = int(time.time())
marketplace["last_update_string"] = datetime.datetime.fromtimestamp(time.time()).strftime(STRFTIME)
try: 
    f = open(OUTPUT_FILE, "w")
    f.write(json.dumps(marketplace, indent=4))
    f.close()
except Exception,e:
    print("ERROR: Unable to save marketplace cache file to "+OUTPUT_FILE+": "+str(e))
