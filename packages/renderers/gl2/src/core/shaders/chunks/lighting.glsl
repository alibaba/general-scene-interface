// void addPointLightPhong(in PointLight pointLight, in Material matr, in vec3 pos, in vec3 normal, inout vec3 result) {
void addPointLightPhong(in PointLight pointLight, in Material matr, in vec3 pos, in vec3 cameraPosition, in vec3 normal, inout vec3 result) {
	vec3 lightColor = pointLight.color;
	vec3 lightPos = pointLight.position;
	vec3 lightDir = normalize(lightPos - pos);

	// 衰减
	float lightDistance = distance(lightPos, pos);
	float attenuation = pow(max(0.0, 1.0 - lightDistance / pointLight.distance), pointLight.decay);

	// 漫反射
	float lambertian = max(dot(normal, lightDir), 0.0);
	result += lightColor * (lambertian * matr.diffuse) * attenuation;

	// 镜面反射
	if (lambertian > 0.0) {
		vec3 viewDir = normalize(cameraPosition - pos);
		vec3 halfwayDir = normalize(lightDir + viewDir);
		float spec = pow(max(dot(normal, halfwayDir), 0.0), matr.shininess);
		// @NOTE: 高光颜色可能需要光源和物体高管颜色设置共同决定
		result += matr.specular * lightColor * spec * attenuation;
	}
}

void addPointLightLambert(in PointLight pointLight, in Material matr, in vec3 pos, in vec3 normal, inout vec3 result) {
	// 漫反射
	vec3 lightColor = pointLight.color;
	vec3 lightPos = pointLight.position;
	vec3 lightDir = normalize(lightPos - pos);
	float diff = max(dot(normal, lightDir), 0.0);
	result += lightColor * (diff * matr.diffuse);
}


void addAmbientLight(in AmbientLight ambientLight, in Material matr, inout vec3 result) {
	result += ambientLight.color * matr.diffuse;
}


void addDirectionalLight(in DirectionalLight directionalLight, in Material matr, in vec3 normal, inout vec3 result) {
	// 漫反射
	vec3 lightColor = directionalLight.color;
	vec3 lightDir = normalize(directionalLight.direction);
	float diff = max(dot(normal, lightDir), 0.0);
	result += lightColor * (diff * matr.diffuse);
}
