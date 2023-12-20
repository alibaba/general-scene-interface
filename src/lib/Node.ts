/**
 * port from spatial-data-vis-framework core.
 * edit:
 * - use for of instead of forEach
 * - rm onAdd onRemove
 * - add traverseUp
 * - accept array in add/remove
 * - rm rootChangeEvent
 * - change event shape
 * - force subclass
 */

/**
 * Copyright (C) 2022 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @author Simon
 * @class AbstractNode
 * @description
 *
 * An abstract tree structure based on EventDispatcher.
 *
 * The tree constructed with AbstractNode is designed to be a "scene graph" :
 * - N-ary (多叉树). A node can have multiple children.
 * - directed (有向). From the root to leaves.
 * - acyclic (无环). No loop. There is one and only one path to every node.
 * - rooted/oriented (有单一根). Every node has a single parent. Every scene has a single root.
 *
 * Also you can not re-use a removed node or change its position.
 */

/**
 * @loop_detection
 * Since we do not allow a node has multiple parents. The only scenario of loop
 * is when the root is added to a inode/leaf of the tree.
 *
 * @example
 *
 * root.add(inode)
 * inode.add(leaf)
 * leaf.add(inode) // error
 * leaf.add(root) // loop
 * inode.add(root) // loop
 */
import { EventDispatcher } from './EventDispatcher'

/**
 * @section NodeEvents
 * @description
 * tree and scene-graph related events
 */

/**
 * the event when this node is added to a parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already added. this event will not fire
 */
type NodeAddEvent = { type: 'add'; target: Node; currentTarget: Node }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
type NodeRemoveEvent = { type: 'remove'; target: Node; currentTarget: Node }
/**
 * the event when this node is removed from its parent node
 * @note will only happen once, because node can only be added once.
 * @note if the node is already removed. this event will not fire
 */
// type NodeRootChangeEvent = { type: 'rootChange'; root: Node | null }

export type NodeEvents = {
	add: NodeAddEvent
	remove: NodeRemoveEvent
	// rootChange: NodeRootChangeEvent
}

/**
 * @explain ### Why not using `this` as the type of `parent`?
 *
 * > `this` as a type, will always refer to the subclass.
 * > While `parent` doesn't have to be the same subclass with this.
 *
 * Technically. Anything extending AbstractNode can be added to the node-tree.
 * LayerA->parent doesn't have to be an instance of LayerA.
 * It can be an instance of LayerB, or Polaris, or some wried stuff used as a container.
 *
 * If a system needs all the nodes fit into a specific sub-class.
 * (Like Polaris.gl needs every node to be either Layer or Polaris, instead of AbstractNode)
 * It should add constrains in sub-class. With following principles:
 *
 * - AbstractNode shouldn't mind logics of its sub-classes.
 * - For parent/child/root, use specific class instead of `this`.
 * - Only use `this` if it's actually about itself.
 *
 * The underlying problem of this:
 * - This kind of feature should be implemented with mixins.
 */

/**
 * the max depth of the tree
 */
export const MAX_DEPTH = 1024

/**
 * Tree structure
 * @note handles tree context
 */
export class Node<
	TEvents extends NodeEvents = NodeEvents,
	TSubclass extends Node = Node<any, any>,
> extends EventDispatcher<TEvents> {
	readonly isNode = true

	/**
	 * has this node been added and removed before
	 * @note currently not support re-add an used node
	 */
	private _removed = false
	private _root: null | TSubclass = null
	private _parent: null | TSubclass = null
	private _children = new Set<TSubclass>()

	/**
	 * parent node
	 * @readonly
	 */
	get parent() {
		return this._parent
	}

	/**
	 * children nodes
	 * @readonly
	 */
	get children() {
		return this._children
	}

	/**
	 * root node of the tree
	 * @readonly
	 */
	get root() {
		return this._root
	}

	add(child: TSubclass | TSubclass[]): void {
		if (Array.isArray(child)) {
			for (const c of child) {
				this.add(c)
			}
			return
		}

		if (child.parent) {
			throw new Error(`AbstractNode: This child already has a parent.`)
		}
		// @note If changing parent is not allowed. This would be redundant,
		// if (this.children.has(child)) {
		// 	throw new Error(`AbstractNode: This child has already been added to current node.`)
		// }
		if (child._removed) {
			throw new Error(`AbstractNode: This node has already been removed before. Do not re-use.`)
		}
		if (child === (this as any)) {
			throw new Error(`AbstractNode: A node cannot be added to itself.`)
		}

		// loop detection.
		if (this.root === child) {
			throw new Error(`AbstractNode: A loop is detected.`)
		}

		// depth detection
		let depth = 0
		let ancestor = this as Node | null
		while (ancestor) {
			ancestor = ancestor.parent
			depth++

			if (depth > MAX_DEPTH) {
				throw new Error(`AbstractNode: Max tree depth exceeded. (${MAX_DEPTH})`)
			}
		}

		this.children.add(child)

		child._parent = this

		// emit `add` before `rootChange`
		child.dispatchEvent({ type: 'add', target: child, currentTarget: this })

		/**
		 * update root and emit `rootChange`
		 * @note only this child and its sub-tree are affected.
		 * @note this will alow changing the tree during traversal
		 *
		 * @note Set.forEach follow the order of adding. inserting a child is an option.
		 *
		 * Newly added node during a traverse(A) may be visited or not:
		 * 1. if node add child to self or parent. new node will be visited by traverse(A)
		 * 2. if node add child to a finished subtree, like, the left sibling. new node won't be.
		 *
		 * In both scenarios, the child's adding will trigger a new traversal (B) for it's subtree.
		 * witch will trigger rootChangeEvent for the new child.
		 *
		 * That is to say, one event can be triggered twice on a node, if the node is added during
		 * a event that is dispatched in a traversal.
		 *
		 * It is necessary to prevent this behavior carefully. Or just do not dispatch events in traversal.
		 */
		// const root = this.root || this // @careful
		// child.traverse((node) => {
		// 	if (node._root !== root) {
		// 		node._root = root
		// 		node.dispatchEvent({ type: 'rootChange', root })
		// 	}
		// })
	}

	remove(child: TSubclass | TSubclass[]): void {
		if (Array.isArray(child)) {
			for (const c of child) {
				this.remove(c)
			}
			return
		}

		this.children.delete(child)

		child._parent = null
		child._root = null
		child._removed = true

		// emit `remove` on child
		child.dispatchEvent({ type: 'remove', target: child, currentTarget: this })

		// update root and emit `rootChange`
		// child.dispatchEvent({ type: 'rootChange', root: null })

		// update root and emit `rootChange`
		// @note only this child and its sub-tree are affected.
		// const root = child // @careful
		// child.traverse((node) => {
		// 	if (node._root !== root) {
		// 		node._root = root
		// 		node.dispatchEvent({ type: 'rootChange', root })
		// 	}
		// })
	}

	removeAll(): void {
		for (const child of this.children) {
			this.remove(child)
		}
	}

	traverse(handler: (node: TSubclass, parent?: TSubclass) => void, parent?: TSubclass): void {
		handler(this as any, parent)
		for (const child of this.children) {
			child.traverse(handler as any, this)
		}
	}

	traverseUp(handler: (node: TSubclass, parent?: TSubclass) => void, parent?: TSubclass): void {
		handler(this as any, parent)
		if (this.parent) {
			this.parent.traverseUp(handler as any, this)
		}
	}

	bubbleEvent<TEventTypeName extends keyof TEvents>(
		event: Omit<TEvents[TEventTypeName], 'target' | 'currentTarget'> & {
			type: TEventTypeName
		}
	): void {
		this.traverseUp((node) => {
			node.dispatchEvent({
				...(event as any),
				target: this,
				currentTarget: node,
			})
		})
	}
}

export function isNode(v: any): v is Node {
	return v.isEventDispatcher && v.isNode
}
export function isRootNode(v: Node) {
	return v.parent === null
}
export function isLeafNode(v: Node) {
	return v.children.size === 0
}

// test code
// const a = new AbstractNode()
// a.addEventListener('add', (event) => {
// 	event.target
// })
// a.addEventListener('rootChange', (event) => {})
// a.addEventListener('ccc', (e) => {})
// a.addEventListener('')
