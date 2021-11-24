/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * @typedef false 关闭抗锯齿
 * @typedef 'msaa' 硬件抗锯齿
 * @typedef 'fxaa' 高性能后期抗锯齿
 * @typedef 'smaa' 高质量后期抗锯齿
 * @typedef 'taa' 时域抗锯齿（高清管线可用）
 */
export type Antialias = false | 'msaa' | 'fxaa' | 'smaa' | 'taa'
