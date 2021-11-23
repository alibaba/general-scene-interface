import { BackSide } from './three/constants';

// Uniforms (refresh uniforms objects)

function refreshUniformsCommon( uniforms, material ) {

	uniforms.opacity = {value: material.opacity};

	if ( material.color ) {

		uniforms.diffuse = {value: material.color};

	}

	if ( material.emissive ) {

		uniforms.emissive = {value: ( material.emissive ).multiplyScalar( material.emissiveIntensity )};

	}

	if ( material.map ) {

		uniforms.map = {value: material.map};

	}

	if ( material.alphaMap ) {

		uniforms.alphaMap = {value: material.alphaMap};

	}

	if ( material.specularMap ) {

		uniforms.specularMap = {value: material.specularMap};

	}

	if ( material.envMap ) {

		uniforms.envMap = {value: material.envMap};

		// don't flip CubeTexture envMaps, flip everything else:
		//  WebGLRenderTargetCube will be flipped for backwards compatibility
		//  WebGLRenderTargetCube.texture will be flipped because it's a Texture and NOT a CubeTexture
		// this check must be handled differently, or removed entirely, if WebGLRenderTargetCube uses a CubeTexture in the future
		uniforms.flipEnvMap = {value: ( ! ( material.envMap && material.envMap.isCubeTexture ) ) ? 1 : - 1};

		uniforms.reflectivity = {value: material.reflectivity};
		uniforms.refractionRatio = {value: material.refractionRatio};

		// uniforms.maxMipLevel = {value: properties.get( material.envMap ).__maxMipLevel};
		uniforms.maxMipLevel = {value: material.envMap.__maxMipLevel};

	}

	if ( material.lightMap ) {

		uniforms.lightMap = {value: material.lightMap};
		uniforms.lightMapIntensity = {value: material.lightMapIntensity};

	}

	if ( material.aoMap ) {

		uniforms.aoMap = {value: material.aoMap};
		uniforms.aoMapIntensity = {value: material.aoMapIntensity};

	}

	// uv repeat and offset setting priorities
	// 1. color map
	// 2. specular map
	// 3. normal map
	// 4. bump map
	// 5. alpha map
	// 6. emissive map

	var uvScaleMap;

	if ( material.map ) {

		uvScaleMap = material.map;

	} else if ( material.specularMap ) {

		uvScaleMap = material.specularMap;

	} else if ( material.displacementMap ) {

		uvScaleMap = material.displacementMap;

	} else if ( material.normalMap ) {

		uvScaleMap = material.normalMap;

	} else if ( material.bumpMap ) {

		uvScaleMap = material.bumpMap;

	} else if ( material.roughnessMap ) {

		uvScaleMap = material.roughnessMap;

	} else if ( material.metalnessMap ) {

		uvScaleMap = material.metalnessMap;

	} else if ( material.alphaMap ) {

		uvScaleMap = material.alphaMap;

	} else if ( material.emissiveMap ) {

		uvScaleMap = material.emissiveMap;

	}

	if ( uvScaleMap !== undefined ) {

		// backwards compatibility
		if ( uvScaleMap.isWebGLRenderTarget ) {

			uvScaleMap = uvScaleMap.texture;

		}

		if ( uvScaleMap.matrixAutoUpdate === true ) {

			uvScaleMap.updateMatrix();

		}

		uniforms.uvTransform = {value: ( uvScaleMap.matrix )};

	}

}

function refreshUniformsLine( uniforms, material ) {

	uniforms.diffuse = {value: material.color};
	uniforms.opacity = {value: material.opacity};

}

function refreshUniformsDash( uniforms, material ) {

	uniforms.dashSize = {value: material.dashSize};
	uniforms.totalSize = {value: material.dashSize + material.gapSize};
	uniforms.scale = {value: material.scale};

}

function refreshUniformsPoints( uniforms, material, _pixelRatio, _height ) {

	uniforms.diffuse = {value: material.color};
	uniforms.opacity = {value: material.opacity};
	uniforms.size = {value: material.size * _pixelRatio};
	uniforms.scale = {value: _height * 0.5};

	uniforms.map = {value: material.map};

	if ( material.map !== null ) {

		if ( material.map.matrixAutoUpdate === true ) {

			material.map.updateMatrix();

		}

		uniforms.uvTransform = {value: ( material.map.matrix )};

	}

}

function refreshUniformsFog( uniforms, fog ) {

	uniforms.fogColor = {value: fog.color};

	if ( fog.isFog ) {

		uniforms.fogNear = {value: fog.near};
		uniforms.fogFar = {value: fog.far};

	} else if ( fog.isFogExp2 ) {

		uniforms.fogDensity = {value: fog.density};

	}

}

function refreshUniformsLambert( uniforms, material ) {

	if ( material.emissiveMap ) {

		uniforms.emissiveMap = {value: material.emissiveMap};

	}

}

function refreshUniformsPhong( uniforms, material ) {

	uniforms.specular = {value: material.specular};
	uniforms.shininess = {value: Math.max( material.shininess, 1e-4 )}; // to prevent pow( 0.0, 0.0 })

	if ( material.emissiveMap ) {

		uniforms.emissiveMap = {value: material.emissiveMap};

	}

	if ( material.bumpMap ) {

		uniforms.bumpMap = {value: material.bumpMap};
		uniforms.bumpScale = {value: material.bumpScale};
		if ( material.side === BackSide ) uniforms.bumpScale.value *= - 1;

	}

	if ( material.normalMap ) {

		uniforms.normalMap = {value: material.normalMap};
		uniforms.normalScale = {value: ( material.normalScale )};
		if ( material.side === BackSide ) uniforms.normalScale.value.negate();

	}

	if ( material.displacementMap ) {

		uniforms.displacementMap = {value: material.displacementMap};
		uniforms.displacementScale = {value: material.displacementScale};
		uniforms.displacementBias = {value: material.displacementBias};

	}

}

function refreshUniformsToon( uniforms, material ) {

	refreshUniformsPhong( uniforms, material );

	if ( material.gradientMap ) {

		uniforms.gradientMap = {value: material.gradientMap};

	}

}

function refreshUniformsStandard( uniforms, material ) {

	uniforms.roughness = {value: material.roughness};
	uniforms.metalness = {value: material.metalness};

	if ( material.roughnessMap ) {

		uniforms.roughnessMap = {value: material.roughnessMap};

	}

	if ( material.metalnessMap ) {

		uniforms.metalnessMap = {value: material.metalnessMap};

	}

	if ( material.emissiveMap ) {

		uniforms.emissiveMap = {value: material.emissiveMap};

	}

	if ( material.bumpMap ) {

		uniforms.bumpMap = {value: material.bumpMap};
		uniforms.bumpScale = {value: material.bumpScale};
		if ( material.side === BackSide ) uniforms.bumpScale.value *= - 1;

	}

	if ( material.normalMap ) {

		uniforms.normalMap = {value: material.normalMap};
		uniforms.normalScale = {value: ( material.normalScale )};
		if ( material.side === BackSide ) uniforms.normalScale.value.negate();

	}

	if ( material.displacementMap ) {

		uniforms.displacementMap = {value: material.displacementMap};
		uniforms.displacementScale = {value: material.displacementScale};
		uniforms.displacementBias = {value: material.displacementBias};

	}

	if ( material.envMap ) {

		//uniforms.envMap = {value: material.envMap}; // part of uniforms commo}n
		uniforms.envMapIntensity = {value: material.envMapIntensity};

	}

}

function refreshUniformsPhysical( uniforms, material ) {

	refreshUniformsStandard( uniforms, material );

	uniforms.reflectivity = {value: material.reflectivity}; // also part of uniforms commo}n

	uniforms.clearCoat = {value: material.clearCoat};
	uniforms.clearCoatRoughness = {value: material.clearCoatRoughness};

}

function refreshUniformsDepth( uniforms, material ) {

	if ( material.displacementMap ) {

		uniforms.displacementMap = {value: material.displacementMap};
		uniforms.displacementScale = {value: material.displacementScale};
		uniforms.displacementBias = {value: material.displacementBias};

	}

}

function refreshUniformsDistance( uniforms, material ) {

	if ( material.displacementMap ) {

		uniforms.displacementMap = {value: material.displacementMap};
		uniforms.displacementScale = {value: material.displacementScale};
		uniforms.displacementBias = {value: material.displacementBias};

	}

	uniforms.referencePosition = {value: ( material.referencePosition )};
	uniforms.nearDistance = {value: material.nearDistance};
	uniforms.farDistance = {value: material.farDistance};

}

function refreshUniformsNormal( uniforms, material ) {

	if ( material.bumpMap ) {

		uniforms.bumpMap = {value: material.bumpMap};
		uniforms.bumpScale = {value: material.bumpScale};
		if ( material.side === BackSide ) uniforms.bumpScale.value *= - 1;

	}

	if ( material.normalMap ) {

		uniforms.normalMap = {value: material.normalMap};
		uniforms.normalScale = {value: ( material.normalScale )};
		if ( material.side === BackSide ) uniforms.normalScale.value.negate();

	}

	if ( material.displacementMap ) {

		uniforms.displacementMap = {value: material.displacementMap};
		uniforms.displacementScale = {value: material.displacementScale};
		uniforms.displacementBias = {value: material.displacementBias};

	}

}

// If uniforms are marked as clean, they don't need to be loaded to the GPU.

function markUniformsLightsNeedsUpdate( uniforms, value ) {

	uniforms.ambientLightColor.needsUpdate = value;

	uniforms.directionalLights.needsUpdate = value;
	uniforms.pointLights.needsUpdate = value;
	uniforms.spotLights.needsUpdate = value;
	uniforms.rectAreaLights.needsUpdate = value;
	uniforms.hemisphereLights.needsUpdate = value;

}

export {
	refreshUniformsCommon,
	refreshUniformsLine,
	refreshUniformsDash,
	refreshUniformsPoints,
	refreshUniformsFog,
	refreshUniformsLambert,
	refreshUniformsPhong,
	refreshUniformsToon,
	refreshUniformsStandard,
	refreshUniformsPhysical,
	refreshUniformsDepth,
	refreshUniformsDistance,
	refreshUniformsNormal,
	markUniformsLightsNeedsUpdate,
}
