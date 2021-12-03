/**
 * @Decorator readonly装饰器
 */
export function readonly() {
	return function (target: any, propertyKey: string, desc: PropertyDescriptor) {
		// desc.writable = false // @QianXun 启用这句会报错
		desc.enumerable = false
		desc.configurable = false
	}
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
export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>
