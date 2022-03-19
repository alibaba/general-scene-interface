import type { MeshDataType } from '@gs.i/schema-scene'

export interface Converter {
	/**
	 * type
	 */
	type: string

	/**
	 * 将gsiMesh转变为指定类型的场景树
	 * 为了保证Renderer中的cache能一直生效，必须对上一次和本次的数据做脏检查来按需增减对象
	 */
	convert: (mesh: MeshDataType) => any

	/**
	 * 手动销毁
	 */
	dispose: () => void
}
