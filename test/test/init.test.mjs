import { MatProcessor } from '@gs.i/processor-matrix'
import { specifyMesh } from '@gs.i/processor-specify'
import chai from 'chai'
const expect = chai.expect

// import { LooseMeshDataType } from '@gs.i/schema-scene'
/**
 * @type LooseMeshDataType
 */
const mockData = {
	// transform: {},
	// extras: {
	// 	_mat:
	// },
}

describe('@gs.i/processor-matrix', () => {
	it('constructor', () => {
		const p = new MatProcessor()
		expect(p.type).to.equal('Matrix')
	})

	it('getID', () => {
		const p = new MatProcessor()

		const a = {}
		const b = {}

		expect(p.getID(a)).to.be.not.equal(p.getID(b))
		expect(p.getID(a)).to.be.equal(p.getID(a))
	})

	it('getLocalMatrix', () => {
		// const p = new MatProcessor()
		// const a = {}
		// const b = {}
		// expect(p.getID(a)).to.be.not.equal(p.getID(b))
		// expect(p.getID(a)).to.be.equal(p.getID(a))
	})
})
