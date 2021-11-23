

float getSpecBlinnPhong(in Material matr, in vec3 fragPos, in vec3 cameraPosition, )

float getSpecBlinnPhong(in vec3 fragPos, in float shininess, in vec3 normal) {
	vec3 lightDir = normalize(pointLightPos - fragPos);
	vec3 viewDir = normalize(cameraPosition - fragPos);
	vec3 halfwayDir = normalize(lightDir + viewDir);
	return pow(max(dot(normal, halfwayDir), 0.0), shininess);
}
