/**
 * dirty range / update range
 */
typedef struct {
    long start;
    long count;
} Range;

/**
 * @brief vectors
 *
 */
typedef struct {
    double x;
    double y;
} Vec2;
typedef struct {
    double x;
    double y;
    double z;
} Vec3;
typedef struct {
    double x;
    double y;
    double z;
    double w;
} Vec4;

/**
 * bounding box
 */
typedef struct {
    Vec3 min;
    Vec3 max;
} BBox3;

typedef struct {
    Vec3   center;
    double radius;
} BSphere3;

typedef struct {
    float r;
    float g;
    float b;
} RGBColor;

// typedef union {
//     double   number;
//     Vec2     vec2;
//     Vec3     vec3;
//     Vec4     vec4;
//     RGBColor rgb;
//     float    matrix33[3][3];
//     float    matrix44[4][4];
// } UniformValue;

// typedef struct {
//     int          type;
//     UniformValue value;
// } Uniform;