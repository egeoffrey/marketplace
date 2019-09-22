// marketplace widget
class Marketplace {
    constructor() {
        this.marketplace_url = "https://api.github.com/repos/egeoffrey/egeoffrey-marketplace/contents/marketplace"
        this.marketplace_branch = "master"
        this.manifests = {}
        this.tags = []
        this.packages_branch = "master"
        this.supported_manifest_schema = 2
        this.first_item = true
    }
    
    // return the html of a tag
    get_tag_html(name, color) {
        if (name == "service" || name == "notification" || name == "interaction") color = "warning"
        if (name == "collection") color = "danger"
        if (name == "controller" || name == "gui" || name == "database" || name == "gateway") color = "info"
        return '\
        <a style="cursor: pointer" onClick=\'$("#search").val("tag:'+name+'"); $("#search").keyup()\'>\
            <span class="badge badge-'+color+' tag" id="'+name+'">'+name+'</span>\
        </a>\
        '
    }
    
    // draw the box for the package
    draw_package(package_name, github) {
        var this_class = this
        // define author
        var split = github.split("/", 1)
        var author = split[0]
        // draw the box content
        var item_html = '\
          <div class="product-img">\
            <i id="'+package_name+'_icon"></i>\
          </div>\
          <div class="product-info">\
            <a class="product-title" target="_blank" href="https://github.com/'+github+'#install"><big>'+package_name+'</big></a>\
            <span class="float-right-container" id="'+package_name+'_tags"></span>\
            <span class="product-description"><b>Branch</b>: <select id="'+package_name+'_branches"></select></span>\
            <span class="product-description"><b>Version</b>: <span id="'+package_name+'_version">N.A.</span></span>\
            <span class="product-description"><b>Author</b>: '+author+'</span>\
            <span class="product-description"><b>Created at</b>: <span id="'+package_name+'_created">N.A.</span></span>\
            <span class="product-description"><b>Last updated at</b>: <span id="'+package_name+'_last_updated">N.A.</span></span>\
            <span class="product-description" id="'+package_name+'_modules_box"><b>Modules</b>: <span id="'+package_name+'_modules"></span></span>\
            <br>\
            <span class="product-description" id="'+package_name+'_description">N.A.</span>\
          </div>\
        '
        $("#"+package_name+"_box").html(item_html)
        // configure branch selector
        $('#'+package_name+'_branches').unbind().change(function(package_name, github) {
            return function () {
                var branch = $("#"+package_name+"_branches").val()
                // download the manifest of the package for the selected branch
                $.get("https://raw.githubusercontent.com/"+github+"/"+branch+"/manifest.yml?timestamp="+(new Date()).getTime(), function(data) {
                    try {
                        var manifest = jsyaml.load(data)
                    } catch(e) {
                        console.log("Invalid manifest file for package "+package_name+": "+e.message)
                        return
                    }
                    if (manifest["manifest_schema"] != this_class.supported_manifest_schema) return
                    // description
                    $("#"+package_name+"_description").html(manifest["description"])
                    // version
                    $("#"+package_name+"_version").html(manifest["version"].toFixed(1)+'-'+manifest["revision"])
                    // tags
                    var tags = manifest["tags"].split(" ")
                    var tags_html = ""
                    for (var tag of tags) {
                        var this_tag_html = this_class.get_tag_html(tag, "secondary")
                        if (! this_class.tags.includes(tag)) {
                            $("#tags").append(this_tag_html)
                            this_class.tags.push(tag)
                        }
                        tags_html = tags_html+this_tag_html
                    }
                    $("#"+package_name+"_tags").html(tags_html)
                    // modules
                    var modules = []
                    if (manifest["modules"].length > 0) {
                        for (var module_object of manifest["modules"]) {
                            for (var module in module_object) modules.push(module)                               
                        }
                    }
                    $("#"+package_name+"_modules").html(modules.join(", "))
                    // hide modules if there are modules
                    if (modules.length == 0) $("#"+package_name+'_modules_box').addClass("d-none")
                    // icon
                    var icon = "icon" in manifest ? manifest["icon"] : "box-open"
                    $("#"+package_name+'_icon').removeClass().addClass("fas fa-2x fa-"+icon)
                    // retrieve repo information
                    $.get("https://api.github.com/repos/"+manifest["github"], function(data) {
                        var created = new Date(data["created_at"])
                        var days_ago = (new Date() - created)/1000/3600/24
                        if (days_ago < 90) $("#"+package_name+"_tags").append(this_class.get_tag_html("new", "primary"))
                        // created at
                        $("#"+package_name+"_created").html(created.toLocaleString())
                    });
                    // retrieve current branch information
                    $.get("https://api.github.com/repos/"+manifest["github"]+"/branches/"+manifest["branch"], function(data) {
                        var last_update = new Date(data["commit"]["commit"]["committer"]["date"])
                        var days_ago = (new Date() - last_update)/1000/3600/24
                        if (days_ago < 30) {
                            $("#"+package_name+"_tags").append(this_class.get_tag_html("updated", "success"))
                        }
                        // last updated at
                        $("#"+package_name+"_last_updated").html(last_update.toLocaleString())
                    });
                    // keep track of the manifest
                    this_class.manifests[package_name] = manifest
                });

            };
        }(package_name, github))
        // retrieve available branches
        $.get("https://api.github.com/repos/"+github+"/branches", function(package_name) {
            return function(data) {
                // populate the branch selector
                var tag = "#"+package_name+"_branches"
                $(tag).empty()
                var has_master = false
                for (var branch_object of data) {
                    var branch = branch_object["name"]
                    $(tag).append('<option value="'+branch+'">'+branch+'</option>')
                    if (branch == "master") has_master = true
                }
                // select a branch
                if (has_master) $(tag).val("master")
                else $(tag).prop("selectedIndex", 0)
                // trigger change event
                $(tag).trigger("change")
            }
        }(package_name));   
    }
    
    // load the marketplace
    load_marketplace() {
        var this_class = this
        // list marketplace entries
        $.get(this.marketplace_url, function(content) {
            console.log("Marketplace has "+content.length+" entries")
            // for each package in the marketplace
            for (var entry of content) {
                if (! ("path" in entry) || ! ("name" in entry)) continue
                var package_name = entry["name"].replace(".yml", "")
                // download the marketplace item
                $.get("https://raw.githubusercontent.com/egeoffrey/egeoffrey-marketplace/"+this_class.marketplace_branch+"/marketplace/"+package_name+".yml?timestamp="+(new Date()).getTime(), function(package_name) {
                    return function(data) {
                        try {
                            var yaml = jsyaml.load(data)
                        } catch(e) {
                            console.log("Invalid marketplace file for package "+package_name+": "+e.message)
                            return
                        }
                        if (! ("github" in yaml)) {
                            console.log("Invalid marketplace file for package "+package_name+": "+e.message)
                            return
                        }
                        // add a box for the package to the page
                        if (this_class.first_item) {
                            $("#marketplace").empty()
                            this_class.first_item = false
                        }
                        $("#marketplace").append('<li class="item text-left" id="'+package_name+'_box"></li>')
                        // draw the package
                        this_class.draw_package(package_name, yaml["github"])
                    }
                }(package_name));
                $("#count").html(parseInt($("#count").html())+1)
            }
        });
    }
    
    // draw the widget's content
    draw() {
        var body = "#body"
        this.manifests = []
        this.tags = []
        $(body).empty()
        var search_html = '\
            <div class="input-group input-group-lg">\
                <input id="search" class="form-control" type="text" placeholder="Search the marketplace...">\
            </div>\
            <br>'
        $(body).append(search_html)
        var this_class = this
        // configure search input
        $("#search").unbind().keyup(function(this_class) {
            return function () {
                var search = $("#search").val()
                var count = 0
                // searching for a tag
                if (search.startsWith("tag:")) {
                    var tag = search.replace("tag:", "")
                    // for each item
                    $(".item").each(function(e){
                        var package_name = this.id.replace("_box", "")
                        var found = false
                        $("#"+package_name+"_tags .tag").each(function(e){
                            if (tag == this.id) found = true
                        });
                        if (found) {
                            $("#"+package_name+"_box").removeClass("d-none")
                            count++
                        }
                        else $("#"+package_name+"_box").addClass("d-none")
                    });
                }
                // free text search
                else {
                    for (var package_name in this_class.manifests) {
                        var manifest = this_class.manifests[package_name]
                        if (manifest["package"].includes(search) || manifest["description"].includes(search) || manifest["tags"].includes(search)) {
                            $("#"+manifest["package"]+"_box").removeClass("d-none")
                            count++
                        }
                        else $("#"+manifest["package"]+"_box").addClass("d-none")
                    }
                }
                $("#count").html(count)
            };
        }(this));
        $(body).append('<div><center><span id="tags"></span></div></center><hr>')
        $(body).append('<ul class="products-list product-list-in-card pl-2 pr-2" id="marketplace"><li class="text-center">Loading marketplace...<br><br><i class="fas fa-spin fa-3x fa-spinner"></i></li></ul>')
        $(body).append('<hr><div class="text-center"><i>viewing <span id="count">0</span> items</i></div>')
        $("#tags").append(this.get_tag_html("new", "primary"))
        $("#tags").append(this.get_tag_html("updated", "success"))
        this.load_marketplace()
    }
    
}