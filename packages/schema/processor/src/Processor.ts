/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

export interface Processor {
	/**
	 * type
	 */
	readonly type: string

	/**
	 * @section hints for Processor combiner
	 * 如果 多个 processor 使用一次遍历处理整棵树，需要指明每个processor会对树做什么
	 * @TODO 可能过度设计
	 */

	/**
	 * traverse setting
	 * @default 'PRE_ORDER'
	 */
	readonly traverseType: TraverseType

	/**
	 * indicate if this processor can edit node members
	 * @default false
	 */
	readonly canEditNode: boolean

	/**
	 * indicate if this processor can change the shape of the tree
	 * @default false
	 */
	readonly canEditTree: boolean

	/**
	 * process the node and all its children (the whole sub DAG)
	 */
	process: (node: any) => any

	/**
	 * process the node only. ignore it's children
	 */
	processNode: (node: any, parent?: any) => any

	/**
	 * clear cache manually
	 * this should not be necessary
	 */
	clearCache: () => void

	/**
	 * 手动销毁
	 * @TODO clearCache 之后这个是不是没有必要了？
	 */
	dispose: () => void
}

/**
 * Traverse Order
 */
export enum TraverseType {
	/**
	 * do not traverse
	 * this processor will not traverse the scene graph.
	 */
	NONE = 'NONE',
	/**
	 * Any Order is ok
	 * Every node is handled independently
	 */
	ANY = 'ANY',
	/**
	 * depth-first + pre-order (NLR)
	 */
	PRE_ORDER = 'PRE_ORDER',
	/**
	 * Breadth-first
	 */
	LEVEL_ORDER = 'LEVEL_ORDER',
}

/**
 * Optional
 * @desc From `T` make a set of properties by key `K` become optional
 * @example
 *    type Props = {
 *      name: string;
 *      age: number;
 *      visible: boolean;
 *    };
 *
 *    // Expect: { name?: string; age?: number; visible?: boolean; }
 *    type Props = Optional<Props>;
 *
 *    // Expect: { name: string; age?: number; visible?: boolean; }
 *    type Props = Optional<Props, 'age' | 'visible'>;
 */

// export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> &
// 	Partial<Pick<T, K>>

// type LooseMeshType = Partial<MeshDataType>
