/**
 * @warning ⚠️☢️☠️
 * global var is a horrible pattern, only use it carefully when necessary.
 * user should always construct instances explicitly.
 *
 * You can **not** assume these variables as Singleton.
 * If these variables are imported by different modules.
 * Whether they are singleton or created separately is all up to the bundler end-user use.
 *
 * Thus, you should assume there are more than one instance of these variables.
 * You won't be able to access them of dispose them.
 *
 * BE VERY CAREFUL!!!
 */

import { MatProcessor } from '@gs.i/processor-matrix'

/**
 * @note
 * This processor should be safe in global scope.
 * Because the only cache in it is a weakmap.
 * As long as user dispose the counterpart GSI object.
 * This processor's cache can be GCed.
 */
export const defaultMatrixProcessor = new MatProcessor()
