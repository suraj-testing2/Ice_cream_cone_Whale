// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function() {
  window.Querypoint = window.Querypoint || {};

  'use strict';

  var FreeVariableChecker = traceur.semantics.FreeVariableChecker;
  var IdentifierToken = traceur.syntax.IdentifierToken;
  var IdentifierExpression = traceur.syntax.trees.IdentifierExpression;
  var BindingIdentifier = traceur.syntax.trees.BindingIdentifier;

  /**
   * Attachs a scope to each variable declaration tree
   *
   * This is run after all transformations to simplify the analysis. In
   * particular we can ignore:
   *   - module imports
   *   - block scope (let/const)
   *   - for of
   *   - generators
   *   - destructuring/rest
   *   - classes
   * as all of these nodes will have been replaced. We assume that synthetic
   * variables (generated by Traceur) will bind correctly, so we don't worry
   * about binding them as well as user defined variables.
   *
   * @param {ErrorReporter} reporter
   * @extends {ParseTreeVisitor}
   * @constructor
   */
  Querypoint.ScopeAttacher = function(reporter) {
    FreeVariableChecker.call(this, reporter);
  }

  /**
   * Gets the name of an identifier expression or token
   * @param {BindingIdentifier|IdentifierToken|string} name
   * @returns {string}
   */
  function getVariableName(name) {
    if (name instanceof IdentifierExpression) {
      name = name.identifierToken;
    } else if (name instanceof BindingIdentifier) {
      name = name.identifierToken;
    }
    if (name instanceof IdentifierToken) {
      name = name.value;
    }
    return name;
  }

  /**
   * Build scopes and attach them to variables in the tree.
   * 
   * @param {ErrorReporter} reporter
   * @param {Program} tree
   */
  Querypoint.ScopeAttacher.attachScopes = function(reporter, tree, global) {
    new Querypoint.ScopeAttacher(reporter).visitProgram(tree, global);
  }

  var proto = FreeVariableChecker.prototype;
  Querypoint.ScopeAttacher.prototype = traceur.createObject(proto, {

    declareVariable_: function(tree) {
      var name = getVariableName(tree);
      if (name) {
        var scope = this.scope_;
        if (!(name in scope.declarations)) {
          scope.declarations[name] = tree;
          tree.scope = scope;
        }
      }
    },

    visitIdentifierExpression: function(tree) {
      var name = getVariableName(tree);
      var scope = this.scope_;
      while (scope) {
        if (Object.hasOwnProperty.call(scope.declarations,name)) {
          var decl = scope.declarations[name];
          if (typeof decl === 'object') {
            decl.references = decl.references || [];
            decl.references.push(tree);
            tree.declaration = decl;
          } // else built-in
          break;
        }
        scope = scope.parent;
      }
    },

  });

  return {
    ScopeAttacher: Querypoint.ScopeAttacher
  };
}());
