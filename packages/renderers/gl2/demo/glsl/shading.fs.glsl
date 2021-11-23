#include <head>
#include <commonUniforms>
#include <lighting>

uniform sampler2D hmap;
uniform sampler2D nmap;

out vec4 fragColor;
in vec2 pos;

void main() {
	vec3 color = texture(map, pos).rgb;
	vec3 normal = normalize(texture(nmap, pos).rgb);
	vec3 position = vec3(pos.x, pos.y, 0.0);
	vec3 result = vec3(0.0);

	Material matr;
	matr.diffuse = color;

	PointLight pointLight;
	pointLight.position = vec3(10.0, 10.0, 0.0);
	pointLight.color = vec3(2.5, 2.5, 2.5);
	pointLight.distance = 1000.0;
	pointLight.decay = 1.0;

	addPointLightLambert(pointLight, matr, position, normal, result);

	result = mix(color, result, smoothstep(0.0, 0.3, texture(hmap, pos).r));

	fragColor = vec4(result, 1.0);

	// if (texture(tex, pos).r < 0.01) {
	// 	fragColor = vec4(0.0, 0.0, 0.0, 1.0);
	// }
}
