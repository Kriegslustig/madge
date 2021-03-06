'use strict';

const exec = require('child_process').exec;
const cyclic = require('./cyclic');
const graphviz = require('graphviz');

/**
 * Set color on a node.
 * @param  {Object} node
 * @param  {String} color
 */
function nodeColor(node, color) {
	node.set('color', color);
	node.set('fontcolor', color);
}

/**
 * Set color for nodes without dependencies.
 * @param  {Object} node
 * @param  {String} [color]
 */
function noDependencyNode(node, color) {
	nodeColor(node, color || '#cfffac');
}

/**
 * Check if Graphviz is installed on the system.
 * @throws Error
 */
function checkGraphvizInstalled() {
	exec('gvpr -V', (error, stdout, stderr) => {
		if (error !== null) {
			throw new Error('Graphviz could not be found. Ensure that "gvpr" is in your $PATH.\n' + error);
		}
	});
}

/**
 * Return options to use with graphviz digraph.
 * @param  {Object} opts
 * @return {Object}
 */
function createGraphvizOptions(opts) {
	// Valid attributes: http://www.graphviz.org/doc/info/attrs.html
	const G = {
		layout: opts.layout || 'dot',
		overlap: false,
		bgcolor: '#ffffff'
	};

	const N = {
		fontname: opts.fontFace || 'Times-Roman',
		fontsize: opts.fontSize || 14
	};

	const E = {};

	if (opts.colors) {
		G.bgcolor = opts.imageColors.bgcolor || '#000000';
		E.color = opts.imageColors.edge || '#757575';
		N.color = opts.imageColors.dependencies || '#c6c5fe';
		N.fontcolor = opts.imageColors.fontColor || opts.imageColors.dependencies || '#c6c5fe';
	}

	return {
		'type': 'png',
		'G': G,
		'E': E,
		'N': N
	};
}

/**
 * Creates a PNG image from the module dependency graph.
 * @param  {Object}   modules
 * @param  {Object}   opts
 * @param  {Function} callback
 */
module.exports.image = function (modules, opts, callback) {
	const g = graphviz.digraph('G');
	const nodes = {};

	checkGraphvizInstalled();

	opts.imageColors = opts.imageColors || {};

	const cyclicResults = cyclic(modules);

	Object.keys(modules).forEach((id) => {

		nodes[id] = nodes[id] || g.addNode(id);
		if (opts.colors && modules[id]) {
			if (!modules[id].length) {
				noDependencyNode(nodes[id], opts.imageColors.noDependencies);
			} else if (cyclicResults.isCyclic(id)) {
				nodeColor(nodes[id], (opts.imageColors.circular || '#ff6c60'));
			}
		}

		modules[id].forEach((depId) => {
			nodes[depId] = nodes[depId] || g.addNode(depId);
			if (opts.colors && !modules[depId]) {
				noDependencyNode(nodes[depId], opts.imageColors.noDependencies);
			}
			g.addEdge(nodes[id], nodes[depId]);
		});
	});

	g.output(createGraphvizOptions(opts), callback);
};

/**
 * Return the module dependency graph as DOT output.
 * @param  {Object} modules
 * @return {String}
 */
module.exports.dot = function (modules) {
	const nodes = {};
	const g = graphviz.digraph('G');

	checkGraphvizInstalled();

	Object.keys(modules).forEach((id) => {
		nodes[id] = nodes[id] || g.addNode(id);

		modules[id].forEach((depId) => {
			nodes[depId] = nodes[depId] || g.addNode(depId);
			g.addEdge(nodes[id], nodes[depId]);
		});
	});

	return g.to_dot();
};
