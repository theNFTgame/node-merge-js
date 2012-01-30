var uglify = require("uglify-js"),
    jsp = require("uglify-js").parser,
    pro = require("uglify-js").uglify,
    mkdirp = require("mkdirp"),
    events = require('events'),
    util   = require('util'),
    fs     = require("fs"),
    path   = require("path"),
    url    = require('url')
    _      = require("underscore");

var mergejs = module.exports = {
    loadGraph: function(rootfile, callback) {
        var importex = /^[\s]*\/\/[\s]*import[\s]*\([\s]*['"][\s]*([A-z0-9_\.\\\/-]+)[\s]*['"][\s]*\)[\s]*;?[\s]*$/gm;

        var stack = [ rootfile ];

        var graph = {
            files: [],
            deps: []
        };

        load(callback);

        function load(callback) {
            if (stack.length == 0)
                return callback(null, graph);

            var current = stack.pop();

            if (_.contains(_.pluck(graph.files, "filename"), current))
                return process.nextTick(function() { load(callback); });

            fs.stat(current, function(err, stats) {
                if (err)
                    return callback(err);

                fs.readFile(current, 'utf8', function(err, str) {
                    if (err)
                        return callback(err);

                    var file = {
                        filename: current,
                        mtime: stats.mtime,
                        data: str.replace(importex, "")
                    };

                    for (var matches; matches = importex.exec(str); matches != null)
                    {
                        var imported = matches[1];
                        var dep = path.resolve(path.dirname(current), imported);

                        stack.push(dep);

                        graph.deps.push({
                            from: current,
                            to: dep 
                        });
                    }

                    graph.files.push(file);

                    return process.nextTick(function() { load(callback); });
                });                
            });
        };
    },

    mergeGraph: function(graph, callback) {
        var sorted = [];
        var stack = _.filter(graph.files, function(x) { 
            return _.filter(graph.deps, function(d) {
                return d.to === x.filename;
            }).length == 0;
        });

        while(stack.length > 0) {
            var file = stack.pop();

            sorted.push(file);

            _.filter(graph.deps, function(d) { return d.from === file.filename; }).forEach(function(e) {
                 graph.deps = _.without(graph.deps, e);

                 if (_.filter(graph.deps, function(d) { return d.to === e.to; }).length == 0)
                    stack.push(_.find(graph.files, function(f) { return f.filename === e.to; }));
            });
        }

        if (graph.deps.length > 0) {
            return callback(new Error("merge-js: there is a dependency cycle which can not be merged."));
        }

        sorted = sorted.reverse();

        var ret = {
            files: _.map(sorted, function(f) { return { filename: f.filename, mtime: f.mtime }; }),
            merged: _.pluck(sorted, "data").join("\r\n")
        };

        callback(null, ret);
    },

    merge: function(filename, callback) {
        mergejs.loadGraph(filename, function(err, graph) {
            if (err)
                return callback(err);

            mergejs.mergeGraph(graph, function(err, data) {
                if (err)
                    return callback(err);

                callback(null, data);
            });
        });
    },
    
    middleware: function(options) {
        var cache = {};

        options = options || {};

        var src = options.src;

        if (!src) {
            throw new Error("'src' directory is not supplied to merge-js.");
        }

        var dest = options.dest || src;
        var mangle = options.mangle == undefined ? true : options.mangle;
        var squeeze = options.squeeze == undefined ? true : options.squeeze;
        var append = options.ext || (dest === src ? true : false);
        var uglify = options.uglify == undefined ? true : options.uglify;

        var jsex = append ? /\.merged.js$/i : /\.js$/i;

        return function(req, res, next) {
            if ('GET' !== req.method && 'HEAD' !== req.method) 
                return next();
            
            var pname = url.parse(req.url).pathname;

            if (!jsex.test(pname))
                return next();

            var srcpath = path.resolve(path.join(src, append ? pname.replace('.merged.js', '.js') : pname));
            var dstpath = path.resolve(path.join(dest, pname));

            fs.stat(srcpath, function(err, sstats) {
                if (err && err.code == 'ENOENT')
                    return next();
                else if (err)
                    return next(err);
                else {
                    fs.stat(dstpath, function(err, dstats) {
                        if (err && err.code == 'ENOENT')
                            return compile();
                        else if (err)
                            return next(err);
                        else if(sstats.mtime > dstats.mtime)
                            return compile();
                        else
                        {
                            var cached = cache[srcpath];

                            if (!cached)
                                return compile();

                            if (!cached.length)
                                return next();

                            var pending = cached.length;
                            var changed = false;

                            cached.forEach(function(cached) {
                                fs.stat(cached.filename, function(err, cstats) {
                                    if (err)
                                        changed = true;
                                    else if (cstats.mtime > cached.mtime)
                                        changed = true;

                                    if (--pending == 0) {
                                        if (changed)
                                            compile();
                                        else
                                            next();
                                    }
                                });
                            });
                        }
                    });
                }
            });

            function compile() {
                mergejs.merge(srcpath, function(err, data) {
                    if (err)
                        return next(err);

                    cache[srcpath] = data.files;

                    mkdirp(path.dirname(dstpath), 0700, function(err){
                        if (err) 
                            return next(err);
                        
                        var fnl = null;

                        if (uglify) {
                            var ast = jsp.parse(data.merged);

                            if (mangle)
                                ast = pro.ast_mangle(ast);
                            if (squeeze)
                                ast = pro.ast_squeeze(ast);

                            fnl = pro.gen_code(ast); 
                        } else {
                            fnl = data.merged;
                        }                     

                        fs.writeFile(dstpath, fnl, 'utf8', next);
                    });
                });                
            }
        };        
    }
};