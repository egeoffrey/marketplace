// marketplace widget
class Marketplace {
    constructor() {
        this.marketplace_url = "https://api.github.com/repos/egeoffrey/egeoffrey-marketplace/contents/marketplace"
        this.marketplace_branch = "master"
        this.manifests = []
        this.packages_branch = "development"
        this.supported_manifest_schema = 2
        this.id = "marketplace"
    }
    
    // load the marketplace
    load_marketplace() {
        var this_class = this
        // list marketplace entries
        $.get(this.marketplace_url, function(content) {
            console.log("Marketplace has "+content.length+" entries")
            $("#"+this_class.id+"_marketplace").empty()
            // for each package in the parketplace
            for (var entry of content) {
                if (! ("path" in entry) || ! ("name" in entry)) continue
                var package_name = entry["name"].replace(".yml", "")
                // download the marketplace item
                $.get("https://raw.githubusercontent.com/egeoffrey/egeoffrey-marketplace/"+this_class.marketplace_branch+"/marketplace/"+package_name+".yml?timestamp="+(new Date()).getTime(), function(data) {
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
                    // download the manifest of the package
                    $.get("https://raw.githubusercontent.com/"+yaml["github"]+"/"+this_class.packages_branch+"/manifest.yml?timestamp="+(new Date()).getTime(), function(data) {
                        try {
                            var manifest = jsyaml.load(data)
                        } catch(e) {
                            console.log("Invalid manifest file for package "+package_name+": "+e.message)
                            return
                        }
                        if (manifest["manifest_schema"] != this_class.supported_manifest_schema) return
                        // define tags
                        var tags = manifest["tags"].split(" ")
                        var tags_html = ""
                        for (var tag of tags) tags_html = tags_html+'<a onClick=\'$("#'+this_class.id+'_search").val("'+tag+'"); $("#'+this_class.id+'_search").keyup()\'><span class="badge badge-info">'+tag+'</span></a>&nbsp;'
                        // define modules
                        var modules = []
                        if (manifest["modules"].length > 0) {
                            for (var module_object of manifest["modules"]) {
                                for (var module in module_object) modules.push(module)                               
                            }
                        }
                        // define icon
                        var icon = "icon" in manifest ? manifest["icon"] : "box-open"
                        // define author
                        var split = manifest["github"].split("/", 1)
                        var author = split[0]
                        // define the item
                        var item_html = '\
                            <li class="item text-left" id="'+this_class.id+'_box_'+manifest["package"]+'">\
                              <div class="product-img">\
                                <i class="fas fa-'+icon+' fa-2x"></i>\
                              </div>\
                              <div class="product-info">\
                                <a class="product-title" target="_blank" href="https://github.com/'+manifest["github"]+'"><big>'+manifest["package"]+'</big></a>\
                                <span class="float-right-container">'+tags_html+'</span>\
                                <span class="product-description"><b>Version</b>: '+manifest["version"].toFixed(1)+'-'+manifest["revision"]+' ('+manifest["branch"]+')</span>\
                                <span class="product-description"><b>Author</b>: '+author+'</span>\
                                <span class="product-description"><b>Modules</b>: '+modules.join(", ")+'</span>\
                                <br>\
                                <span class="product-description">'+manifest["description"]+'</span>\
                              </div>\
                            </li>\
                        '
                        // add the marketplace item to the page
                        $("#"+this_class.id+"_marketplace").append(item_html)
                        this_class.manifests.push(manifest)
                    });
                });   
            }
        });
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _box, _title, _refresh, _popup, _body, _loading
        // IDs Widget: _table
        var body = "#body"
        this.manifests = []
        $(body).empty()
        var search_html = '\
            <div class="input-group">\
                <span class="input-group-btn">\
                  <button type="button" class="btn btn-info btn-flat" id="'+this.id+'_branch_button">Switch Branch</button>\
                </span>\
                 <input id="'+this.id+'_branch" class="form-control" id="'+this.id+'_branch" type="text" value="'+this.packages_branch+'" placeholder="">\
            </div><br>\
            <div class="input-group input-group-lg">\
                <input id="'+this.id+'_search" class="form-control" type="text" placeholder="Search the marketplace...">\
            </div>\
            <br>'
        $(body).append(search_html)
        var this_class = this
        // configure branch input
        $("#"+this.id+"_branch_button").unbind().click(function(this_class) {
            return function () {
                var branch = $("#"+this_class.id+"_branch").val()
                this_class.packages_branch = branch
                this_class.draw()
            };
        }(this));
        // configure search input
        $("#"+this.id+"_search").unbind().keyup(function(this_class) {
            return function () {
                var search = $("#"+this_class.id+"_search").val()
                for (var manifest of this_class.manifests) {
                    if (manifest["package"].includes(search) || manifest["description"].includes(search) || manifest["tags"].includes(search)) $("#"+this_class.id+"_box_"+manifest["package"]).removeClass("d-none")
                    else $("#"+this_class.id+"_box_"+manifest["package"]).addClass("d-none")
                }
            };
        }(this));
        $(body).append('<ul class="products-list product-list-in-card pl-2 pr-2" id="'+this.id+'_marketplace"><li><i class="fas fa-spin fa-3x fa-spinner"></i> Loading marketplace...</li></ul>')
        this.load_marketplace()
    }
    
}