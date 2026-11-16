/**
 * Clean-room WebGL 3D Engine & Orbit Navigation Module for PROJECT ATLAS.
 * Implements Three.js-compatible scene graph, geometries, materials, instanced meshes,
 * lighting, raycasting, and orbit camera controls completely offline.
 */

export const REVISION = '160-atlas-local';

export class Color {
  constructor(r = 1, g = 1, b = 1) {
    this.r = 1; this.g = 1; this.b = 1;
    this.set(r, g, b);
  }
  set(r, g, b) {
    if (typeof r === 'string') {
      let hex = r.replace('#', '').trim();
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      if (!Number.isNaN(num)) {
        this.r = ((num >> 16) & 255) / 255;
        this.g = ((num >> 8) & 255) / 255;
        this.b = (num & 255) / 255;
      }
    } else if (typeof r === 'number' && g === undefined) {
      this.r = ((r >> 16) & 255) / 255;
      this.g = ((r >> 8) & 255) / 255;
      this.b = (r & 255) / 255;
    } else if (r instanceof Color) {
      this.r = r.r; this.g = r.g; this.b = r.b;
    } else if (typeof r === 'number') {
      this.r = r; this.g = g ?? r; this.b = b ?? r;
    }
    return this;
  }
  clone() { return new Color(this.r, this.g, this.b); }
  toArray() { return [this.r, this.g, this.b]; }
}

export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
  length() { return Math.hypot(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() {
    const len = this.length() || 1;
    return this.multiplyScalar(1 / len);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  project(camera) {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  }
}

export class Matrix4 {
  constructor() {
    this.elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }
  identity() {
    this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return this;
  }
  copy(m) { this.elements.set(m.elements); return this; }
  clone() { return new Matrix4().copy(this); }
  multiplyMatrices(a, b) {
    const ae = a.elements, be = b.elements, te = this.elements;
    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }
  compose(pos, rotEuler, scale) {
    const cx = Math.cos(rotEuler.x), sx = Math.sin(rotEuler.x);
    const cy = Math.cos(rotEuler.y), sy = Math.sin(rotEuler.y);
    const cz = Math.cos(rotEuler.z), sz = Math.sin(rotEuler.z);

    const r00 = cy * cz, r01 = cz * sx * sy - cx * sz, r02 = cx * cz * sy + sx * sz;
    const r10 = cy * sz, r11 = cx * cz + sx * sy * sz, r12 = -cz * sx + cx * sy * sz;
    const r20 = -sy,     r21 = cy * sx,                r22 = cx * cy;

    const sx_ = scale.x, sy_ = scale.y, sz_ = scale.z;
    const te = this.elements;
    te[0] = r00 * sx_; te[4] = r01 * sy_; te[8]  = r02 * sz_; te[12] = pos.x;
    te[1] = r10 * sx_; te[5] = r11 * sy_; te[9]  = r12 * sz_; te[13] = pos.y;
    te[2] = r20 * sx_; te[6] = r21 * sy_; te[10] = r22 * sz_; te[14] = pos.z;
    te[3] = 0;         te[7] = 0;         te[11] = 0;         te[15] = 1;
    return this;
  }
  makePerspective(fovDeg, aspect, near, far) {
    const f = 1.0 / Math.tan((fovDeg * Math.PI) / 360.0);
    const nf = 1 / (near - far);
    const te = this.elements;
    te.fill(0);
    te[0] = f / (aspect || 1);
    te[5] = f;
    te[10] = (far + near) * nf;
    te[11] = -1;
    te[14] = 2 * far * near * nf;
    return this;
  }
  lookAtView(eye, target, up) {
    const zAxis = new Vector3().subVectors(eye, target).normalize();
    if (zAxis.length() === 0) zAxis.z = 1;
    const xAxis = new Vector3().crossVectors(up, zAxis).normalize();
    if (xAxis.length() === 0) {
      zAxis.x += 0.0001;
      xAxis.crossVectors(up, zAxis).normalize();
    }
    const yAxis = new Vector3().crossVectors(zAxis, xAxis);
    const te = this.elements;
    te[0] = xAxis.x; te[4] = xAxis.y; te[8]  = xAxis.z; te[12] = -xAxis.dot(eye);
    te[1] = yAxis.x; te[5] = yAxis.y; te[9]  = yAxis.z; te[13] = -yAxis.dot(eye);
    te[2] = zAxis.x; te[6] = zAxis.y; te[10] = zAxis.z; te[14] = -zAxis.dot(eye);
    te[3] = 0;       te[7] = 0;       te[11] = 0;       te[15] = 1;
    return this;
  }
}

export class Object3D {
  constructor() {
    this.uuid = Math.random().toString(36).slice(2, 11);
    this.name = '';
    this.position = new Vector3(0, 0, 0);
    this.rotation = new Vector3(0, 0, 0);
    this.scale = new Vector3(1, 1, 1);
    this.matrix = new Matrix4();
    this.matrixWorld = new Matrix4();
    this.parent = null;
    this.children = [];
    this.visible = true;
    this.userData = {};
  }
  add(child) {
    if (!child || child === this) return this;
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    return this;
  }
  remove(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parent = null;
      this.children.splice(idx, 1);
    }
    return this;
  }
  clear() {
    for (const c of this.children) c.parent = null;
    this.children.length = 0;
    return this;
  }
  updateMatrixWorld() {
    this.matrix.compose(this.position, this.rotation, this.scale);
    if (this.parent) {
      this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    } else {
      this.matrixWorld.copy(this.matrix);
    }
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].updateMatrixWorld();
    }
  }
  getWorldPosition(target = new Vector3()) {
    this.updateMatrixWorld();
    const e = this.matrixWorld.elements;
    return target.set(e[12], e[13], e[14]);
  }
  traverse(cb) {
    cb(this);
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].traverse(cb);
    }
  }
}

export class Scene extends Object3D {
  constructor() {
    super();
    this.background = new Color('#030712');
  }
}

export class Group extends Object3D {}

export class PerspectiveCamera extends Object3D {
  constructor(fov = 50, aspect = 1.77, near = 0.1, far = 20000) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.target = new Vector3(0, 0, 0);
    this.up = new Vector3(0, 1, 0);
    this.projectionMatrix = new Matrix4();
    this.matrixWorldInverse = new Matrix4();
    this.updateProjectionMatrix();
  }
  updateProjectionMatrix() {
    this.projectionMatrix.makePerspective(this.fov, this.aspect, this.near, this.far);
  }
  lookAt(x, y, z) {
    if (x instanceof Vector3) this.target.copy(x);
    else this.target.set(x, y, z);
    this.matrixWorldInverse.lookAtView(this.position, this.target, this.up);
  }
}

export class BufferAttribute {
  constructor(array, itemSize) {
    this.array = array instanceof Float32Array || array instanceof Uint16Array || array instanceof Uint32Array
      ? array
      : new Float32Array(array);
    this.itemSize = itemSize;
    this.count = this.array.length / itemSize;
    this.needsUpdate = true;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) {
    super(array instanceof Float32Array ? array : new Float32Array(array), itemSize);
  }
}

export class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.index = null;
    this.boundingRadius = 1.0;
    this._glBuffers = null;
  }
  setAttribute(name, attr) {
    this.attributes[name] = attr;
    if (name === 'position') {
      let maxR = 0;
      const arr = attr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const d = Math.hypot(arr[i], arr[i + 1], arr[i + 2]);
        if (d > maxR) maxR = d;
      }
      this.boundingRadius = maxR || 1.0;
    }
    return this;
  }
  setIndex(indices) {
    this.index = indices instanceof Uint32Array || indices instanceof Uint16Array
      ? indices
      : new Uint32Array(indices);
    return this;
  }
  setFromPoints(pts) {
    const arr = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      arr[i * 3] = pts[i].x;
      arr[i * 3 + 1] = pts[i].y;
      arr[i * 3 + 2] = pts[i].z;
    }
    this.setAttribute('position', new Float32BufferAttribute(arr, 3));
    return this;
  }
  dispose() { this._glBuffers = null; }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 32, heightSegments = 20) {
    super();
    const ws = Math.max(8, widthSegments);
    const hs = Math.max(6, heightSegments);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= hs; y++) {
      const v = y / hs;
      const theta = v * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let x = 0; x <= ws; x++) {
        const u = x / ws;
        const phi = u * Math.PI * 2;
        const nx = -Math.cos(phi) * sinTheta;
        const ny = cosTheta;
        const nz = Math.sin(phi) * sinTheta;
        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < hs; y++) {
      for (let x = 0; x < ws; x++) {
        const a = y * (ws + 1) + x;
        const b = a + ws + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.boundingRadius = radius;
  }
}

export class RingGeometry extends BufferGeometry {
  constructor(innerRadius = 1.2, outerRadius = 2.4, thetaSegments = 64) {
    super();
    const segs = Math.max(16, thetaSegments);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      positions.push(innerRadius * c, 0, innerRadius * s);
      normals.push(0, 1, 0);
      uvs.push(0, i / segs);

      positions.push(outerRadius * c, 0, outerRadius * s);
      normals.push(0, 1, 0);
      uvs.push(1, i / segs);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2);
      indices.push(a + 1, a + 3, a + 2);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.boundingRadius = outerRadius;
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 16) {
    super();
    const segs = Math.max(6, radialSegments);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const halfH = height / 2;

    for (let y = 0; y <= 1; y++) {
      const v = y;
      const r = y === 0 ? radiusTop : radiusBottom;
      const py = y === 0 ? halfH : -halfH;
      for (let x = 0; x <= segs; x++) {
        const u = x / segs;
        const theta = u * Math.PI * 2;
        const nx = Math.sin(theta), nz = Math.cos(theta);
        positions.push(r * nx, py, r * nz);
        normals.push(nx, 0, nz);
        uvs.push(u, v);
      }
    }
    for (let x = 0; x < segs; x++) {
      const a = x;
      const b = x + segs + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.boundingRadius = Math.max(radiusTop, radiusBottom, halfH);
  }
}

export class ConeGeometry extends CylinderGeometry {
  constructor(radius = 0.5, height = 1, radialSegments = 16) {
    super(0.001, radius, height, radialSegments);
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(radius = 1, tube = 0.2, radialSegments = 12, tubularSegments = 32, arc = Math.PI * 2) {
    super();
    const rs = Math.max(6, radialSegments);
    const ts = Math.max(12, tubularSegments);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let j = 0; j <= rs; j++) {
      for (let i = 0; i <= ts; i++) {
        const u = (i / ts) * arc;
        const v = (j / rs) * Math.PI * 2;
        const cx = (radius + tube * Math.cos(v)) * Math.cos(u);
        const cy = (radius + tube * Math.cos(v)) * Math.sin(u);
        const cz = tube * Math.sin(v);
        positions.push(cx, cy, cz);

        const tx = radius * Math.cos(u);
        const ty = radius * Math.sin(u);
        const nx = cx - tx, ny = cy - ty, nz = cz;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
        uvs.push(i / ts, j / rs);
      }
    }
    for (let j = 1; j <= rs; j++) {
      for (let i = 1; i <= ts; i++) {
        const a = (ts + 1) * j + i - 1;
        const b = (ts + 1) * (j - 1) + i - 1;
        const c = (ts + 1) * (j - 1) + i;
        const d = (ts + 1) * j + i;
        indices.push(a, b, d, b, c, d);
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.boundingRadius = radius + tube;
  }
}

export class BoxGeometry extends BufferGeometry {
  constructor(w = 1, h = 1, d = 1) {
    super();
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const positions = [
      // Front
      -hw, -hh,  hd,  hw, -hh,  hd,  hw,  hh,  hd, -hw,  hh,  hd,
      // Back
       hw, -hh, -hd, -hw, -hh, -hd, -hw,  hh, -hd,  hw,  hh, -hd,
      // Top
      -hw,  hh,  hd,  hw,  hh,  hd,  hw,  hh, -hd, -hw,  hh, -hd,
      // Bottom
      -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
      // Right
       hw, -hh,  hd,  hw, -hh, -hd,  hw,  hh, -hd,  hw,  hh,  hd,
      // Left
      -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh,  hd, -hw,  hh, -hd
    ];
    const normals = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0,
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
     -1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0
    ];
    const uvs = [];
    const indices = [];
    for (let f = 0; f < 6; f++) {
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      const b = f * 4;
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    this.boundingRadius = Math.hypot(hw, hh, hd);
  }
}

export class IcosahedronGeometry extends SphereGeometry {
  constructor(radius = 1, detail = 0) {
    super(radius, 6 + detail * 4, 4 + detail * 2);
  }
}

export class Texture {
  constructor(image = null) {
    this.image = image;
    this.needsUpdate = true;
    this._glTexture = null;
  }
  dispose() { this._glTexture = null; }
}

export class CanvasTexture extends Texture {
  constructor(canvas) {
    super(canvas);
  }
}

export class TextureLoader {
  load(url, onLoad) {
    const tex = new Texture();
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
      if (onLoad) onLoad(tex);
    };
    img.src = url;
    return tex;
  }
}

export const DoubleSide = 2;
export const AdditiveBlending = 2;
export const NormalBlending = 1;

export class Material {
  constructor(params = {}) {
    this.color = new Color(params.color !== undefined ? params.color : '#ffffff');
    this.emissive = new Color(params.emissive !== undefined ? params.emissive : '#000000');
    this.emissiveIntensity = params.emissiveIntensity ?? 0.0;
    this.map = params.map || null;
    this.opacity = params.opacity ?? 1.0;
    this.transparent = Boolean(params.transparent);
    this.wireframe = Boolean(params.wireframe);
    this.side = params.side ?? 0;
    this.blending = params.blending ?? NormalBlending;
    this.depthWrite = params.depthWrite ?? true;
    this.size = params.size ?? 2.0;
    this.vertexColors = Boolean(params.vertexColors);
    this.roughness = params.roughness ?? 0.6;
    this.metalness = params.metalness ?? 0.1;
    this.specularStrength = params.specularStrength ?? 0.18;
    this.rimColor = new Color(params.rimColor !== undefined ? params.rimColor : '#000000');
    this.rimStrength = params.rimStrength ?? 0.0;
    this.nightLights = params.nightLights ? 1 : 0;
    this.isBasic = false;
  }
  dispose() {}
}

export class MeshStandardMaterial extends Material {
  constructor(params = {}) { super(params); this.isBasic = false; }
}

export class MeshPhongMaterial extends Material {
  constructor(params = {}) { super(params); this.isBasic = false; }
}

export class MeshBasicMaterial extends Material {
  constructor(params = {}) { super(params); this.isBasic = true; }
}

export class LineBasicMaterial extends Material {
  constructor(params = {}) { super(params); this.isBasic = true; }
}

export class PointsMaterial extends Material {
  constructor(params = {}) { super(params); this.isBasic = true; }
}

export class Mesh extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new MeshStandardMaterial()) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  }
}

export class InstancedMesh extends Mesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
    this.isInstancedMesh = true;
    this.instanceMatrices = Array.from({ length: count }, () => new Matrix4());
  }
  setMatrixAt(index, matrix) {
    if (index >= 0 && index < this.count) {
      this.instanceMatrices[index].copy(matrix);
    }
  }
}

export class Line extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new LineBasicMaterial()) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isLine = true;
  }
}

export class LineLoop extends Line {
  constructor(geometry, material) {
    super(geometry, material);
    this.isLineLoop = true;
  }
}

export class Points extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new PointsMaterial()) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isPoints = true;
  }
}

export class AmbientLight extends Object3D {
  constructor(color = '#ffffff', intensity = 0.3) {
    super();
    this.color = new Color(color);
    this.intensity = intensity;
    this.isAmbientLight = true;
  }
}

export class PointLight extends Object3D {
  constructor(color = '#ffffff', intensity = 2.0, distance = 0) {
    super();
    this.color = new Color(color);
    this.intensity = intensity;
    this.distance = distance;
    this.isPointLight = true;
  }
}

export class CatmullRomCurve3 {
  constructor(points = []) {
    this.points = points;
  }
  getPoint(t) {
    const pts = this.points;
    if (pts.length === 0) return new Vector3();
    if (pts.length === 1) return pts[0].clone();
    const p = (pts.length - 1) * Math.max(0, Math.min(1, t));
    const intPoint = Math.floor(p);
    const weight = p - intPoint;
    const p0 = pts[Math.max(0, intPoint - 1)];
    const p1 = pts[intPoint];
    const p2 = pts[Math.min(pts.length - 1, intPoint + 1)];
    const p3 = pts[Math.min(pts.length - 1, intPoint + 2)];

    const w2 = weight * weight;
    const w3 = w2 * weight;
    const calc = (v0, v1, v2, v3) => 0.5 * (
      (2 * v1) +
      (-v0 + v2) * weight +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * w2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * w3
    );
    return new Vector3(
      calc(p0.x, p1.x, p2.x, p3.x),
      calc(p0.y, p1.y, p2.y, p3.y),
      calc(p0.z, p1.z, p2.z, p3.z)
    );
  }
  getPoints(divisions = 50) {
    const out = [];
    for (let i = 0; i <= divisions; i++) {
      out.push(this.getPoint(i / divisions));
    }
    return out;
  }
}

export class Raycaster {
  constructor() {
    this.rayOrigin = new Vector3();
    this.rayDir = new Vector3();
  }
  setFromCamera(ndc, camera) {
    this.rayOrigin.copy(camera.position);
    const forward = new Vector3().subVectors(camera.target, camera.position).normalize();
    const right = new Vector3().crossVectors(forward, camera.up).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360.0);
    const dx = ndc.x * camera.aspect * tanHalfFov;
    const dy = ndc.y * tanHalfFov;
    this.rayDir.copy(forward)
      .add(right.multiplyScalar(dx))
      .add(up.multiplyScalar(dy))
      .normalize();
  }
  intersectObjects(objects, recursive = true) {
    const hits = [];
    const checkObj = (obj) => {
      if (!obj || !obj.visible) return;
      if (obj.isMesh && !obj.isInstancedMesh && obj.geometry) {
        const center = obj.getWorldPosition();
        const maxScale = Math.max(obj.scale.x, obj.scale.y, obj.scale.z);
        const radius = (obj.geometry.boundingRadius || 1) * maxScale * 1.15;
        const oc = new Vector3().subVectors(center, this.rayOrigin);
        const proj = oc.dot(this.rayDir);
        if (proj > 0) {
          const distSq = oc.dot(oc) - proj * proj;
          if (distSq <= radius * radius) {
            const distance = Math.max(0, proj - Math.sqrt(Math.max(0, radius * radius - distSq)));
            hits.push({ object: obj, distance, point: center.clone() });
          }
        }
      }
      if (recursive && obj.children) {
        for (let i = 0; i < obj.children.length; i++) checkObj(obj.children[i]);
      }
    };
    for (let i = 0; i < objects.length; i++) checkObj(objects[i]);
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }
}

const VERT_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute vec3 aColor;
attribute float aSize;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uPointSize;
uniform int uUseAttrSize;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vColor;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNormal);
  vUv = aUv;
  vColor = aColor;
  gl_Position = uProjection * uView * worldPos;
  gl_PointSize = uUseAttrSize == 1 ? (uPointSize * aSize) : uPointSize;
}
`;

const FRAG_SHADER = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vColor;

uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uOpacity;
uniform int uUseTexture;
uniform int uIsBasic;
uniform int uIsPoint;
uniform int uUseVertexColor;
uniform vec3 uLightPos;
uniform vec3 uCamPos;
uniform vec3 uAmbientColor;
uniform float uSpecularStrength;
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform int uNightLights;
uniform sampler2D uSampler;

void main() {
  if (uIsPoint == 1) {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float core = exp(-r * 3.2);
    float alpha = (0.35 * (1.0 - r) + 0.65 * core) * uOpacity;
    vec3 ptCol = (uUseVertexColor == 1 ? vColor : uColor) * (0.85 + 0.45 * core);
    gl_FragColor = vec4(ptCol, alpha);
    return;
  }

  vec4 texColor = uUseTexture == 1 ? texture2D(uSampler, vUv) : vec4(1.0);
  vec3 baseCol = (uUseVertexColor == 1 ? vColor : uColor) * texColor.rgb;
  float finalAlpha = uOpacity * texColor.a;

  if (finalAlpha < 0.015) discard;

  if (uIsBasic == 1) {
    gl_FragColor = vec4(baseCol + uEmissive * uEmissiveIntensity, finalAlpha);
    return;
  }

  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vWorldPos);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 H = normalize(L + V);

  float ndotl = dot(N, L);
  float diff = max(ndotl, 0.0);
  float wrap = max(0.0, (ndotl + 0.22) / 1.22);

  // Subtle terminator warm scattering
  float terminator = smoothstep(-0.15, 0.05, ndotl) * (1.0 - smoothstep(0.05, 0.3, ndotl));
  vec3 termTint = vec3(1.0, 0.55, 0.25) * terminator * 0.14;

  // Blinn-Phong specular highlight (stronger on oceans / ice)
  float specMask = 1.0;
  if (uNightLights == 1) {
    // Ocean vs continent mask on Earth based on blue dominance
    specMask = clamp((texColor.b - texColor.g * 0.65) * 3.0, 0.15, 1.4);
  }
  float spec = pow(max(dot(N, H), 0.0), 28.0) * uSpecularStrength * specMask * diff;

  // Fresnel atmospheric rim light
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);
  vec3 rim = uRimColor * uRimStrength * fresnel * (0.35 + 0.65 * wrap);

  vec3 lit = baseCol * (uAmbientColor + vec3(0.98, 0.96, 0.92) * (0.78 * diff + 0.22 * wrap)) + termTint + vec3(spec) + rim;

  // Earth night-side city lights on continents when facing away from Sun
  if (uNightLights == 1 && ndotl < 0.08) {
    float nightFactor = smoothstep(0.08, -0.28, ndotl);
    float isLand = clamp((texColor.g - texColor.b * 0.72) * 4.5, 0.0, 1.0);
    float cityPattern = step(0.62, fract(sin(dot(floor(vUv * vec2(180.0, 90.0)), vec2(12.9898, 78.233))) * 43758.5453));
    float cluster = smoothstep(0.2, 0.8, sin(vUv.x * 38.0) * cos(vUv.y * 24.0) + 0.5);
    lit += vec3(1.0, 0.78, 0.38) * nightFactor * isLand * cityPattern * cluster * 0.75;
  }

  lit += uEmissive * uEmissiveIntensity;
  gl_FragColor = vec4(lit, finalAlpha);
}
`;

export class WebGLRenderer {
  constructor(params = {}) {
    this.domElement = params.canvas || document.createElement('canvas');
    this.pixelRatio = 1;
    this.width = this.domElement.width || 1280;
    this.height = this.domElement.height || 720;
    this.info = { render: { calls: 0, triangles: 0, points: 0 } };
    this._Fallback2D = false;

    const gl = this.domElement.getContext('webgl', {
      antialias: params.antialias !== false,
      alpha: false,
      preserveDrawingBuffer: true
    }) || this.domElement.getContext('experimental-webgl');

    this.gl = gl;
    if (gl) {
      this._initWebGL(gl);
    } else {
      this._Fallback2D = true;
      this.ctx2d = this.domElement.getContext('2d');
    }
  }

  _initWebGL(gl) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.program = prog;

    this.locs = {
      aPosition: gl.getAttribLocation(prog, 'aPosition'),
      aNormal: gl.getAttribLocation(prog, 'aNormal'),
      aUv: gl.getAttribLocation(prog, 'aUv'),
      aColor: gl.getAttribLocation(prog, 'aColor'),
      aSize: gl.getAttribLocation(prog, 'aSize'),
      uUseAttrSize: gl.getUniformLocation(prog, 'uUseAttrSize'),
      uProjection: gl.getUniformLocation(prog, 'uProjection'),
      uView: gl.getUniformLocation(prog, 'uView'),
      uModel: gl.getUniformLocation(prog, 'uModel'),
      uPointSize: gl.getUniformLocation(prog, 'uPointSize'),
      uColor: gl.getUniformLocation(prog, 'uColor'),
      uEmissive: gl.getUniformLocation(prog, 'uEmissive'),
      uEmissiveIntensity: gl.getUniformLocation(prog, 'uEmissiveIntensity'),
      uOpacity: gl.getUniformLocation(prog, 'uOpacity'),
      uUseTexture: gl.getUniformLocation(prog, 'uUseTexture'),
      uIsBasic: gl.getUniformLocation(prog, 'uIsBasic'),
      uIsPoint: gl.getUniformLocation(prog, 'uIsPoint'),
      uUseVertexColor: gl.getUniformLocation(prog, 'uUseVertexColor'),
      uLightPos: gl.getUniformLocation(prog, 'uLightPos'),
      uCamPos: gl.getUniformLocation(prog, 'uCamPos'),
      uAmbientColor: gl.getUniformLocation(prog, 'uAmbientColor'),
      uSpecularStrength: gl.getUniformLocation(prog, 'uSpecularStrength'),
      uRimColor: gl.getUniformLocation(prog, 'uRimColor'),
      uRimStrength: gl.getUniformLocation(prog, 'uRimStrength'),
      uNightLights: gl.getUniformLocation(prog, 'uNightLights'),
      uSampler: gl.getUniformLocation(prog, 'uSampler')
    };

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    this._uintExt = gl.getExtension('OES_element_index_uint');
    this._defaultWhiteTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._defaultWhiteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  }

  setPixelRatio(r) {
    this.pixelRatio = Math.min(2, Math.max(0.5, r || 1));
  }

  setSize(w, h) {
    this.width = Math.max(1, Math.floor(w * this.pixelRatio));
    this.height = Math.max(1, Math.floor(h * this.pixelRatio));
    this.domElement.width = this.width;
    this.domElement.height = this.height;
    this.domElement.style.width = `${w}px`;
    this.domElement.style.height = `${h}px`;
    if (this.gl) {
      this.gl.viewport(0, 0, this.width, this.height);
    }
  }

  _ensureGeometryBuffers(gl, geom) {
    if (!geom._glBuffers) geom._glBuffers = {};
    const bufs = geom._glBuffers;

    const uploadAttr = (name) => {
      const attr = geom.attributes[name];
      if (!attr) return null;
      if (!bufs[name] || attr.needsUpdate) {
        if (!bufs[name]) bufs[name] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[name]);
        gl.bufferData(gl.ARRAY_BUFFER, attr.array, gl.STATIC_DRAW);
        attr.needsUpdate = false;
      }
      return bufs[name];
    };

    uploadAttr('position');
    uploadAttr('normal');
    uploadAttr('uv');
    uploadAttr('color');
    uploadAttr('size');

    if (geom.index && !bufs.index) {
      bufs.index = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.index);
      const use32 = Boolean(this._uintExt);
      const idxArr = use32
        ? (geom.index instanceof Uint32Array ? geom.index : new Uint32Array(geom.index))
        : (geom.index instanceof Uint16Array ? geom.index : new Uint16Array(geom.index));
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxArr, gl.STATIC_DRAW);
      bufs.indexType = use32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      bufs.indexCount = idxArr.length;
    }
    return bufs;
  }

  _bindTexture(gl, tex) {
    if (!tex || !tex.image) {
      if (this._defaultWhiteTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._defaultWhiteTex);
      }
      return false;
    }
    if (tex.image instanceof HTMLImageElement && (!tex.image.complete || tex.image.naturalWidth === 0)) {
      return false;
    }
    if (!tex._glTexture) {
      tex._glTexture = gl.createTexture();
      tex.needsUpdate = true;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex._glTexture);
    if (tex.needsUpdate) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      tex.needsUpdate = false;
    }
    return true;
  }

  render(scene, camera) {
    scene.updateMatrixWorld();
    camera.lookAt(camera.target);

    if (this._Fallback2D || !this.gl) {
      this._renderFallback2D(scene, camera);
      return;
    }

    const gl = this.gl;
    const bg = scene.background || new Color('#030712');
    gl.clearColor(bg.r, bg.g, bg.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.info.render.calls = 0;
    this.info.render.triangles = 0;
    this.info.render.points = 0;

    let lightPos = new Vector3(0, 0, 0);
    let ambientCol = new Color(0.22, 0.25, 0.32);

    const opaqueList = [];
    const transparentList = [];

    scene.traverse((obj) => {
      if (!obj.visible) return;
      if (obj.isPointLight) obj.getWorldPosition(lightPos);
      if (obj.isAmbientLight) {
        ambientCol.set(
          obj.color.r * obj.intensity,
          obj.color.g * obj.intensity,
          obj.color.b * obj.intensity
        );
      }
      if (obj.isMesh || obj.isLine || obj.isPoints) {
        if (obj.material && obj.material.transparent) transparentList.push(obj);
        else opaqueList.push(obj);
      }
    });

    gl.uniformMatrix4fv(this.locs.uProjection, false, camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(this.locs.uView, false, camera.matrixWorldInverse.elements);
    gl.uniform3f(this.locs.uLightPos, lightPos.x, lightPos.y, lightPos.z);
    gl.uniform3f(this.locs.uCamPos, camera.position.x, camera.position.y, camera.position.z);
    gl.uniform3f(this.locs.uAmbientColor, ambientCol.r, ambientCol.g, ambientCol.b);
    gl.uniform1i(this.locs.uSampler, 0);

    const drawObj = (obj) => {
      const geom = obj.geometry;
      const mat = obj.material;
      if (!geom || !mat || !geom.attributes.position) return;
      const bufs = this._ensureGeometryBuffers(gl, geom);

      const bindAttr = (loc, buf, size, fallbackVal) => {
        if (loc < 0) return;
        if (buf) {
          gl.enableVertexAttribArray(loc);
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        } else {
          gl.disableVertexAttribArray(loc);
          if (size === 3) gl.vertexAttrib3f(loc, fallbackVal[0], fallbackVal[1], fallbackVal[2]);
          else if (size === 2) gl.vertexAttrib2f(loc, fallbackVal[0], fallbackVal[1]);
          else if (size === 1) gl.vertexAttrib1f(loc, fallbackVal[0]);
        }
      };

      bindAttr(this.locs.aPosition, bufs.position, 3, [0, 0, 0]);
      bindAttr(this.locs.aNormal, bufs.normal, 3, [0, 1, 0]);
      bindAttr(this.locs.aUv, bufs.uv, 2, [0, 0]);
      bindAttr(this.locs.aColor, bufs.color, 3, [1, 1, 1]);
      bindAttr(this.locs.aSize, bufs.size, 1, [1.0]);
      gl.uniform1i(this.locs.uUseAttrSize, bufs.size ? 1 : 0);

      if (mat.transparent) {
        gl.enable(gl.BLEND);
        if (mat.blending === AdditiveBlending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(Boolean(mat.depthWrite));
      } else {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
      }

      const hasTex = this._bindTexture(gl, mat.map);
      gl.uniform1i(this.locs.uUseTexture, hasTex ? 1 : 0);
      gl.uniform3f(this.locs.uColor, mat.color.r, mat.color.g, mat.color.b);
      gl.uniform3f(this.locs.uEmissive, mat.emissive.r, mat.emissive.g, mat.emissive.b);
      gl.uniform1f(this.locs.uEmissiveIntensity, mat.emissiveIntensity || 0);
      gl.uniform1f(this.locs.uSpecularStrength, mat.specularStrength ?? 0.18);
      gl.uniform3f(this.locs.uRimColor, mat.rimColor ? mat.rimColor.r : 0, mat.rimColor ? mat.rimColor.g : 0, mat.rimColor ? mat.rimColor.b : 0);
      gl.uniform1f(this.locs.uRimStrength, mat.rimStrength || 0);
      gl.uniform1i(this.locs.uNightLights, mat.nightLights || 0);
      gl.uniform1f(this.locs.uOpacity, mat.opacity ?? 1.0);
      gl.uniform1i(this.locs.uIsBasic, mat.isBasic || obj.isLine || obj.isPoints ? 1 : 0);
      gl.uniform1i(this.locs.uIsPoint, obj.isPoints ? 1 : 0);
      gl.uniform1i(this.locs.uUseVertexColor, mat.vertexColors && bufs.color ? 1 : 0);
      gl.uniform1f(this.locs.uPointSize, (mat.size || 2.0) * this.pixelRatio);

      if (obj.isInstancedMesh) {
        const instMat = new Matrix4();
        for (let i = 0; i < obj.count; i++) {
          instMat.multiplyMatrices(obj.matrixWorld, obj.instanceMatrices[i]);
          gl.uniformMatrix4fv(this.locs.uModel, false, instMat.elements);
          if (bufs.index) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.index);
            gl.drawElements(gl.TRIANGLES, bufs.indexCount, bufs.indexType, 0);
            this.info.render.triangles += bufs.indexCount / 3;
          } else {
            gl.drawArrays(gl.TRIANGLES, 0, geom.attributes.position.count);
          }
          this.info.render.calls++;
        }
      } else {
        gl.uniformMatrix4fv(this.locs.uModel, false, obj.matrixWorld.elements);
        if (obj.isPoints) {
          gl.drawArrays(gl.POINTS, 0, geom.attributes.position.count);
          this.info.render.points += geom.attributes.position.count;
        } else if (obj.isLine) {
          gl.drawArrays(obj.isLineLoop ? gl.LINE_LOOP : gl.LINE_STRIP, 0, geom.attributes.position.count);
        } else if (bufs.index) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.index);
          gl.drawElements(mat.wireframe ? gl.LINES : gl.TRIANGLES, bufs.indexCount, bufs.indexType, 0);
          this.info.render.triangles += bufs.indexCount / 3;
        } else {
          gl.drawArrays(gl.TRIANGLES, 0, geom.attributes.position.count);
        }
        this.info.render.calls++;
      }
    };

    for (let i = 0; i < opaqueList.length; i++) drawObj(opaqueList[i]);
    for (let i = 0; i < transparentList.length; i++) drawObj(transparentList[i]);
    gl.depthMask(true);
  }

  _renderFallback2D(scene, camera) {
    const ctx = this.ctx2d;
    if (!ctx) return;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, this.width, this.height);
    scene.traverse((obj) => {
      if (!obj.visible || !obj.isMesh) return;
      const p = obj.getWorldPosition().project(camera);
      if (p.z < -1 || p.z > 1) return;
      const sx = (p.x * 0.5 + 0.5) * this.width;
      const sy = (-p.y * 0.5 + 0.5) * this.height;
      const col = obj.material?.color || new Color(1, 1, 1);
      ctx.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, 12 * obj.scale.x), 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

export class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = camera.target;
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.08;
    this.minDistance = 2.0;
    this.maxDistance = 8000.0;

    this._spherical = { radius: 140, phi: Math.PI * 0.34, theta: 0.45 };
    this._targetSpherical = { radius: 140, phi: Math.PI * 0.34, theta: 0.45 };
    this._panOffset = new Vector3();
    this._isDragging = false;
    this._dragButton = 0;
    this._prevMouse = { x: 0, y: 0 };

    this.syncFromCamera();
    this._bindEvents();
  }

  syncFromCamera() {
    const offset = new Vector3().subVectors(this.camera.position, this.target);
    const r = Math.max(this.minDistance, offset.length());
    const phi = Math.acos(Math.max(-0.999, Math.min(0.999, offset.y / r)));
    const theta = Math.atan2(offset.x, offset.z);
    this._spherical = { radius: r, phi, theta };
    this._targetSpherical = { radius: r, phi, theta };
  }

  _bindEvents() {
    const el = this.domElement;
    if (!el) return;

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this._isDragging = true;
      this._dragButton = e.button;
      this._prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || !this._isDragging) return;
      const dx = e.clientX - this._prevMouse.x;
      const dy = e.clientY - this._prevMouse.y;
      this._prevMouse = { x: e.clientX, y: e.clientY };

      if (this._dragButton === 0) {
        this._targetSpherical.theta -= dx * 0.0055;
        this._targetSpherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, this._targetSpherical.phi - dy * 0.0055));
      } else if (this._dragButton === 2 || this._dragButton === 1) {
        const panScale = this._spherical.radius * 0.0015;
        const forward = new Vector3().subVectors(this.target, this.camera.position).normalize();
        const right = new Vector3().crossVectors(forward, this.camera.up).normalize();
        const up = new Vector3().crossVectors(right, forward).normalize();
        this._panOffset.add(right.multiplyScalar(-dx * panScale)).add(up.multiplyScalar(dy * panScale));
      }
    });

    window.addEventListener('mouseup', () => {
      this._isDragging = false;
    });

    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      this._targetSpherical.radius = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this._targetSpherical.radius * factor)
      );
    }, { passive: false });
  }

  zoomBy(factor) {
    this._targetSpherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this._targetSpherical.radius * factor)
    );
  }

  rotateBy(dTheta, dPhi) {
    this._targetSpherical.theta += dTheta;
    this._targetSpherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, this._targetSpherical.phi + dPhi));
  }

  update() {
    if (!this.enabled) return;
    const damp = this.enableDamping ? 0.18 : 1.0;
    this._spherical.radius += (this._targetSpherical.radius - this._spherical.radius) * damp;
    this._spherical.phi += (this._targetSpherical.phi - this._spherical.phi) * damp;
    this._spherical.theta += (this._targetSpherical.theta - this._spherical.theta) * damp;

    if (this._panOffset.length() > 0.0001) {
      this.target.add(this._panOffset);
      this._panOffset.set(0, 0, 0);
    }

    const r = this._spherical.radius;
    const sinPhi = Math.sin(this._spherical.phi);
    this.camera.position.set(
      this.target.x + r * sinPhi * Math.sin(this._spherical.theta),
      this.target.y + r * Math.cos(this._spherical.phi),
      this.target.z + r * sinPhi * Math.cos(this._spherical.theta)
    );
    this.camera.lookAt(this.target);
  }
}

export default {
  REVISION,
  Color,
  Vector2,
  Vector3,
  Matrix4,
  Object3D,
  Scene,
  Group,
  PerspectiveCamera,
  BufferAttribute,
  Float32BufferAttribute,
  BufferGeometry,
  SphereGeometry,
  RingGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  BoxGeometry,
  IcosahedronGeometry,
  Texture,
  CanvasTexture,
  TextureLoader,
  DoubleSide,
  AdditiveBlending,
  NormalBlending,
  Material,
  MeshStandardMaterial,
  MeshPhongMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  PointsMaterial,
  Mesh,
  InstancedMesh,
  Line,
  LineLoop,
  Points,
  AmbientLight,
  PointLight,
  CatmullRomCurve3,
  Raycaster,
  WebGLRenderer,
  OrbitControls
};
