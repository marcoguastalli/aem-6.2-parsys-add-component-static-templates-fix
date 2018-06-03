/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */
(function ($, ns, channel, window, undefined) {
    "use strict";

    /**
     * The {@link Granite.author.components} store has bean cleaned
     *
     * @event Document#cq-components-store-cleaned
     */

    /**
     * The {@link Granite.author.components} store has bean set
     *
     * @event Document#cq-components-store-set
     */

    /**
     * All the allowed components corresponding to the current content have been filtered
     *
     * @event Document#cq-components-filtered
     */

    /**
     * Array of components available on the page
     *
     * Initialized by {@link Document#event:cq-components-loaded}; available on {@link Document#event:cq-editor-loaded}
     *
     * @namespace
     * @alias Granite.author.components
     */
    ns.components = (function () {
        var self = [];

        /**
         * All the allowed components in the page
         *
         * Initialized by {@link Document#event:cq-components-filtered}
         *
         * @memberof Granite.author.components
         * @alias allowedComponents
         * @type {Array<Granite.author.Component>}
         */
        self.allowedComponents = [];

        /**
         * Allowed components for a given path
         *
         * Where the key is the path of an {@link Granite.author.Editable}
         *
         * Initialized by {@link Document#event:cq-components-filtered}
         *
         * @memberof Granite.author.components
         * @alias allowedComponentsFor
         * @type {{}}
         */
        self.allowedComponentsFor = {};

        /**
         * Deletes all components from the components store
         *
         * @memberof Granite.author.components
         * @alias clean
         * @fires Document#cq-components-store-cleaned
         */
        self.clean = function () {
            self.length = 0;

            channel.trigger('cq-components-store-cleaned');
        };

        /**
         * Adds one or more components to the components store
         *
         * @memberof Granite.author.components
         * @alias add
         *
         * @param {Array<Granite.author.Component>|Granite.author.Component} components - List of components to be added
         */
        self.add = function (components) {
            $.each($.isArray(components) ? components : [components], function (i, e) {
                self.push(e);
            });
        };

        /**
         * Removes components from the components store
         *
         * @memberof Granite.author.components
         * @alias remove
         *
         * @param {Array<Granite.author.Component>|Granite.author.Component} components - List of components to be removed
         */
        self.remove = function (components) {
            var affected = $.isArray(components) ? components : [components],
                toRemove = [];

            // collect the elements to delete
            $.each(affected, function (i, e) {
                if (e instanceof Granite.Component) {
                    toRemove.push(e);
                } else { // plain search advice
                    self.find(e).forEach(function (e) {
                        toRemove.push(e);
                    });
                }
            });

            // really delete them from array
            $.each(self, function (i, e) {
                if ($.inArray(e, toRemove)) {
                    self.splice(i, 1);
                }
            });
        };

        /**
         * Sets components in the components store and deletes all previous existing components
         *
         * @memberof Granite.author.components
         * @alias set
         * @fires Document#cq-components-store-set
         *
         * @param {Array<Granite.author.Component>|Granite.author.Component} components - List of components to be added
         */
        self.set = function (components) {
            self.clean();
            self.add(components);

            channel.trigger($.Event('cq-components-store-set', {
                components: components
            }));
        };

        /**
         * Find components based ont the give search criteria
         *
         * @memberof Granite.author.components
         * @alias find
         *
         * @param {string|{path:string}|{path:RegExp}} search - Component path or RegExp to match multiple path of components
         * @return {Array<Granite.author.Component>} List of components
         */
        self.find = function (search) {
            var result = [];

            if ($.type(search) === "string") { // then we
                search = {
                    path: search
                };
            }

            if (search.path) {
                $.each(self, function (i, component) {
                    // path searching
                    if (search.path instanceof RegExp ? search.path.test(component.getPath()) : component.getPath() === search.path) {
                        result.push(component);
                    }
                });

            } else if (search.resourceType) {
                $.each(self, function (i, component) {
                    // path searching
                    if (search.resourceType instanceof RegExp ? search.resourceType.test(component.getResourceType()) : component.getResourceType() === search.resourceType) {
                        result.push(component);
                    }
                });

            } else if (search.group) {
                $.each(self, function (i, component) {
                    // group searching
                    if (search.group instanceof RegExp ? search.group.test(component.getGroup()) : component.getGroup() === search.group) {
                        result.push(component);
                    }
                });
            }

            return result;
        };

        /**
         * Returns the groups fro the given components
         *
         * @memberof Granite.author.components
         * @alias getGroups
         *
         * @param {Granite.author.Component} components - The list of components from which to get the groups
         * @returns {Array<string>}
         */
        self.getGroups = function (components) {
            var comps = components || self.allowedComponents,
                groups = [], g;

            comps.forEach(function (component) {
                g = component.getGroup();

                if (groups.indexOf(g) === -1) {
                    groups.push(g);
                }
            });

            return groups;

        };

        /**
         * Updates the allowed components based on the given filter
         *
         * @memberof Granite.author.components
         * @alias filterAllowedComponents
         * @fires Document#cq-components-filtered
         *
         * @param {Array<string>} filter    - list of terms to search for. May be paths, resource types or groups
         * @param {boolean} [append]        - Should the found list of components be added to the allowed components of the current store
         */
        // TODO See usages of ns.components.filterAllowedComponents => not needed most of the time
        self.filterAllowedComponents = function (filter, append) {
            var allowedComponents = [];

            // Convert array to map for convenience
            if (Array.isArray(filter)) {
                var filterArray = filter;
                filter = {};

                filterArray.forEach(function (element) {
                    filter[element] = true;
                });
            }

            for (var key in filter) {
                var searchOptions = {};
                var index = key.indexOf("/");

                // Component path or resource type (contains at least one "/")
                if (index !== -1) {
                    // Full component path
                    if (index === 0) {
                        searchOptions.path = key;
                        // Resource type
                    } else {
                        searchOptions.resourceType = key;
                    }
                } else {
                    // Component group
                    searchOptions.group = key.substring(key.indexOf(":") + 1);
                }

                $.each(self.find(searchOptions), function (i, c) {
                    if (allowedComponents.indexOf(c) < 0) {
                        allowedComponents.push(c);
                    }
                });
            }

            if (append && $.isArray(self.allowedComponents)) {
                // Avoid duplicates
                allowedComponents.forEach(function (allowedComponent) {
                    if (self.allowedComponents.indexOf(allowedComponent) === -1) {
                        self.allowedComponents.push(allowedComponent);
                    }
                });
            } else {
                self.allowedComponents = allowedComponents;
            }

            // Allowed components have been updated; spread the news
            channel.trigger($.Event("cq-components-filtered", {
                allowedComponents: allowedComponents,
                append: append
            }));
        };

        /**
         * Find the allowed components of the given Editable based on a policy path
         *
         * @memberof Granite.author.components
         * @alias _findAllowedComponentsFromPolicy
         * @private
         * @ignore
         *
         * @param {Granite.author.Editable} editable    - The editable for which to find allowed components from
         * @param {{}} design                           - Configuration object from where to find allowed components
         * @returns {Array.<Granite.author.Component>}
         */
        self._findAllowedComponentsFromPolicy = function (editable, design) {
            var cell = ns.util.resolveProperty(design, editable.config.policyPath);

            if (!cell || !cell.components) {
                // Inherit allowed components from its parent
                var parent = ns.editables.getParent(editable);

                while (parent && !(cell && cell.components)) {
                    cell = ns.util.resolveProperty(design, parent.config.policyPath);
                    parent = ns.editables.getParent(parent);
                }
            }

            if (cell && cell.components) {
                // Return an array (cell.components could be either an array or a string)
                return [].concat(cell.components);
            }
        };

        /**
         * Checks that every element has a parsys between siblings and add it if not
         *
         * @param {string} path                         - Path of the component
         * @returns {string}                            - Path of the component with all the parsys included
         */
        self.getComponentWithParsysPath = function (path) {
            var components = path.split('/');

            Array.prototype.insert = function ( index, item ) {
                this.splice( index, 0, item );
            };

            function isEven(n) {
              n = Number(n);
              return n === 0 || !!(n && !(n%2));
            }

            function isOdd(n) {
              return isEven(Number(n) + 1);
            }

            for (var i = 0; i < components.length; i++) {
                if (isOdd(i) && components[i] !== "parsys") {
                    components.insert(i, "parsys");
                }
            }

            return components.toString().replace(new RegExp(',', 'g'), '/');
        };

        /**
         * Returns an array of strings representing the list of allowed components extracted from the given design configuration object
         *
         * <p>Those could be either a path, a resource type or component group</p>
         *
         * @memberof Granite.author.components
         * @alias _findAllowedComponentsFromDesign
         * @private
         * @ignore
         *
         * @param {Granite.author.Editable} editable    - Editable for which to compute a list of allowed components
         * @param {{}} design                           - Design configuration object from which to get the actual configuration
         * @returns {string[]|undefined}                - An array of string in case of a configuration object has been found. Undefined otherwise
         */
        self._findAllowedComponentsFromDesign = function (editable, design) {
            var allowed = [];

            if (editable && editable.config) {
                if (editable.config.policyPath) {
                    allowed = self._findAllowedComponentsFromPolicy(editable, design);
                } else {
                    // All cell search paths
                    var cellSearchPaths = editable.config.cellSearchPath;

                    if (cellSearchPaths) {
                        for (var i = 0; i < cellSearchPaths.length; i++) {
                            var cell = ns.util.resolveProperty(design, self.getComponentWithParsysPath(cellSearchPaths[i]));

                            if (cell && cell.components) {
                                // Return an array (cell.components could be either an array or a string)
                                allowed = allowed.concat(cell.components);
                                return allowed;
                            }
                        }
                    }
                }
            }

            return allowed;
        };

        /**
         * Updates the allowed component list from the corresponding listener associated to the given editable
         *
         * @memberof Granite.author.components
         * @private
         * @ignore
         *
         * @param editable
         * @param allowedComponents
         * @returns {*}
         */
        self._updateAllowedComponentsFromListener = function (editable, allowedComponents) {
            // Listener hook to manipulate the calculated list of allowed components
            if (editable.updateComponentList) {
                editable.updateComponentList(allowedComponents, self);
            }
            return allowedComponents;
        };

        /**
         * Returns an array of string representing the list of allowed components
         *
         * <p>Those could be either a path, a resource type or component group</p>
         *
         * <p>The component store also stores the list in its {@link Granite.author.components.allowedComponentsFor} registry later usage and retrieval</p>
         *
         * @memberof Granite.author.components
         * @alias computeAllowedComponents
         *
         * @param {Granite.author.Editable} editable    - Editable for which to compute a list of allowed components
         * @param {{}} design                           - Design configuration object from which to get the actual configuration
         * @returns {string[]|undefined}                - An array of string in case of a configuration object has been found or undefined otherwise
         */
        self.computeAllowedComponents = function (editable, design) {
            if (!editable || !editable.config || !editable.config.isContainer) {
                return;
            }

            var allowedFromDesign = self._findAllowedComponentsFromDesign(editable, design);
            var allowed = self._updateAllowedComponentsFromListener(editable, allowedFromDesign);

            // If no components restrictions are defined on the current editable, look up the parent
            var parent = ns.editables.getParent(editable);
            if (allowed && allowed.length === 0 && parent) {
                return self.computeAllowedComponents(parent, design);
            }

            self.allowedComponentsFor[editable.path] = allowed;

            // TODO: legacy; use ns.components.allowedComponentsFor(path) instead
            editable.design.allowedComponents = allowed;

            return allowed;
        };

        /**
        * Sorts the components by comparing their title and their group
        *
        * @param c1 - First component
        * @param c2 - Second component
        * @returns {number} - Result of the comparison
        */
        self.sortComponents = function (c1, c2) {
            if (c1.getTitle() === c2.getTitle()) {
                if (c1.getGroup() < c2.getGroup()) {
                    return -1;
                } else if (c1.getGroup() > c2.getGroup()) {
                    return 1;
                }

                return 0;
            }

            return c1.getTitle() < c2.getTitle() ? -1 : 1;
        }

        return self;
    }());

    channel.on("cq-components-loaded", function (event) {
        ns.components.set(event.components);
    });

    // Editor data available (after loading new content frame)
    // NB: We have to make sure both editables (store) and design are available to perform allowed components computation
    channel.on("cq-editor-loaded", function () {
        ns.components.allowedComponents = [];
        ns.components.allowedComponentsFor = {};

        // First, compute allowed components for all editables
        ns.editables.forEach(function (editable) {
            ns.components.filterAllowedComponents(
                ns.components.computeAllowedComponents(editable, ns.pageDesign),
                true);
        });

        // Then, every time an editable is added to the store, run the computation again
        channel.off("cq-inspectable-added.allowedcomponents")
            .on("cq-inspectable-added.allowedcomponents", function (event) {
                ns.components.filterAllowedComponents(
                    ns.components.computeAllowedComponents(event.inspectable, ns.pageDesign),
                    true); // append = true
            });
    });

}(jQuery, Granite.author, jQuery(document), this));
