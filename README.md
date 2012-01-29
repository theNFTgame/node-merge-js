Merge JS
====================

This library is an extension for the [Uglify JS][1] library to add merge multiple js files
according to their dependencies on each other and produce a combined js file by uglifying the
result.

You can install the library through the Node Package Manager by running
`npm install merge-js`.

Import
====================

merge-js resolves dependencies between files and merges them into a single file. In order to define
a dependency, simply use a commented import statement in your js files like this;

    // import("lib/jquery.js")
    // import("lib/underscore.js")

    $(function() {
        alert("Test"); 
    });

Connect Middleware
====================

merge-js has been developed to be used primarily with [Connect][2]. Sample for activating
merge-js in Express:

    app.use(require("merge-js").middleware({ 
        src: __dirname + "/assets", 
        dest: __dirname + "/public" 
    }));

In this case, merge looks up for the js files in /assets dir and compiles them to /public dir.

Configuration
-------------

The following options are supported:

 * `src`: Source directory of JavaScript files.
 * `dest`: Destination directory to place uglified files. If omitted, this will
   default to match `src` and your generated files will be suffixed with
   `.merged.js` rather than just `.js`.
 * `uglify`: Boolean indicating whether the code should be uglified at all.
 * `mangle`: Boolean indicating whether variable names should be mangled.
 * `squeeze`: Boolean indicating whether the code should be squeezed.
 * `ext`: Boolean indicating whether to use the `.merged.js` extension for
   generated files.

Developed By
============

* Ekin Koc - <ekin@eknkc.com>


License
=======

    Copyright 2011 Ekin Koc

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.


 [1]: https://github.com/mishoo/UglifyJS
 [2]: http://senchalabs.github.com/connect/