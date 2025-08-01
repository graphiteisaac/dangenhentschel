// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length2 = 0;
    while (current) {
      current = current.tail;
      length2++;
    }
    return length2 - 1;
  }
};
function prepend(element3, tail) {
  return new NonEmpty(element3, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index4) {
    if (index4 < 0 || index4 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index4);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a2 = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a2 !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a2 = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a2 >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index4) {
  if (bitOffset === 0) {
    return buffer[index4] ?? 0;
  } else {
    const a2 = buffer[index4] << bitOffset & 255;
    const b = buffer[index4 + 1] >> 8 - bitOffset;
    return a2 | b;
  }
}
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value2) {
    super();
    this[0] = value2;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a2 = values3.pop();
    let b = values3.pop();
    if (a2 === b) continue;
    if (!isObject(a2) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a2, b) || unequalDates(a2, b) || unequalBuffers(a2, b) || unequalArrays(a2, b) || unequalMaps(a2, b) || unequalSets(a2, b) || unequalRegExps(a2, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a2);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a2.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get2] = getters(a2);
    const ka = keys2(a2);
    const kb = keys2(b);
    if (ka.length !== kb.length) return false;
    for (let k of ka) {
      values3.push(get2(a2, k), get2(b, k));
    }
  }
  return true;
}
function getters(object4) {
  if (object4 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object4 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a2, b) {
  return a2 instanceof Date && (a2 > b || a2 < b);
}
function unequalBuffers(a2, b) {
  return !(a2 instanceof BitArray) && a2.buffer instanceof ArrayBuffer && a2.BYTES_PER_ELEMENT && !(a2.byteLength === b.byteLength && a2.every((n, i) => n === b[i]));
}
function unequalArrays(a2, b) {
  return Array.isArray(a2) && a2.length !== b.length;
}
function unequalMaps(a2, b) {
  return a2 instanceof Map && a2.size !== b.size;
}
function unequalSets(a2, b) {
  return a2 instanceof Set && (a2.size != b.size || [...a2].some((e) => !b.has(e)));
}
function unequalRegExps(a2, b) {
  return a2 instanceof RegExp && (a2.source !== b.source || a2.flags !== b.flags);
}
function isObject(a2) {
  return typeof a2 === "object" && a2 !== null;
}
function structurallyCompatibleObjects(a2, b) {
  if (typeof a2 !== "object" && typeof b !== "object" && (!a2 || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a2 instanceof c)) return false;
  return a2.constructor === b.constructor;
}
function makeError(variant, file, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.file = file;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var None = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a2, b) {
  return a2 ^ b + 2654435769 + (a2 << 6) + (a2 >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value2) {
  return map_insert(key, value2, dict2);
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix instanceof Empty) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function first(list4) {
  if (list4 instanceof Empty) {
    return new Error(void 0);
  } else {
    let first$1 = list4.head;
    return new Ok(first$1);
  }
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2 instanceof Empty) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4 instanceof Empty) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function find2(loop$list, loop$is_desired) {
  while (true) {
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4 instanceof Empty) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare4 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4 instanceof Empty) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare4(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare4;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare4;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else {
          let _block;
          if (direction instanceof Ascending) {
            _block = prepend(reverse(growing$1), acc);
          } else {
            _block = prepend(growing$1, acc);
          }
          let acc$1 = _block;
          if (rest$1 instanceof Empty) {
            return prepend(toList([new$1]), acc$1);
          } else {
            let next = rest$1.head;
            let rest$2 = rest$1.tail;
            let _block$1;
            let $1 = compare4(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = new Ascending();
            } else if ($1 instanceof Eq) {
              _block$1 = new Ascending();
            } else {
              _block$1 = new Descending();
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare4;
            loop$growing = toList([new$1]);
            loop$direction = direction$1;
            loop$prev = next;
            loop$acc = acc$1;
          }
        }
      } else if ($ instanceof Lt) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Eq) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let ascending1 = sequences2.head;
        let ascending2 = $.head;
        let rest$1 = $.tail;
        let descending = merge_ascendings(
          ascending1,
          ascending2,
          compare4,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare4;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let descending1 = sequences2.head;
        let descending2 = $.head;
        let rest$1 = $.tail;
        let ascending = merge_descendings(
          descending1,
          descending2,
          compare4,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare4;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare4 = loop$compare;
    if (sequences2 instanceof Empty) {
      return sequences2;
    } else if (direction instanceof Ascending) {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences2, compare4, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Descending();
        loop$compare = compare4;
      }
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences2, compare4, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Ascending();
        loop$compare = compare4;
      }
    }
  }
}
function sort(list4, compare4) {
  if (list4 instanceof Empty) {
    return list4;
  } else {
    let $ = list4.tail;
    if ($ instanceof Empty) {
      return list4;
    } else {
      let x = list4.head;
      let y = $.head;
      let rest$1 = $.tail;
      let _block;
      let $1 = compare4(x, y);
      if ($1 instanceof Lt) {
        _block = new Ascending();
      } else if ($1 instanceof Eq) {
        _block = new Ascending();
      } else {
        _block = new Descending();
      }
      let direction = _block;
      let sequences$1 = sequences(
        rest$1,
        compare4,
        toList([x]),
        direction,
        y,
        toList([])
      );
      return merge_all(sequences$1, new Ascending(), compare4);
    }
  }
}
function shuffle_pair_unwrap_loop(loop$list, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return acc;
    } else {
      let elem_pair = list4.head;
      let enumerable = list4.tail;
      loop$list = enumerable;
      loop$acc = prepend(elem_pair[1], acc);
    }
  }
}
function do_shuffle_by_pair_indexes(list_of_pairs) {
  return sort(
    list_of_pairs,
    (a_pair, b_pair) => {
      return compare(a_pair[0], b_pair[0]);
    }
  );
}
function shuffle(list4) {
  let _pipe = list4;
  let _pipe$1 = fold(
    _pipe,
    toList([]),
    (acc, a2) => {
      return prepend([random_uniform(), a2], acc);
    }
  );
  let _pipe$2 = do_shuffle_by_pair_indexes(_pipe$1);
  return shuffle_pair_unwrap_loop(_pipe$2, toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function append2(first2, second) {
  return first2 + second;
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function capitalise(string5) {
  let $ = pop_grapheme(string5);
  if ($ instanceof Ok) {
    let first$1 = $[0][0];
    let rest = $[0][1];
    return append2(uppercase(first$1), lowercase(rest));
  } else {
    return "";
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path2) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path2;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data;
  let errors;
  maybe_invalid_data = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map2(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data;
      let errors;
      data = $[0];
      errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders instanceof Empty) {
      return failure2;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure2;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first2, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first2.function(dynamic_data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
function run_dynamic_function(data, name, f) {
  let $ = f(data);
  if ($ instanceof Ok) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError(name, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_int(data) {
  return run_dynamic_function(data, "Int", int);
}
var int2 = /* @__PURE__ */ new Decoder(decode_int);
function decode_string(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function push_path(layer, path2) {
  let decoder = one_of(
    string2,
    toList([
      (() => {
        let _pipe = int2;
        return map2(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map(
    path2,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($ instanceof Ok) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map(
    layer[1],
    (error) => {
      return new DecodeError(
        error.expected,
        error.found,
        append(path$1, error.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path2 = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path2 instanceof Empty) {
      let _pipe = inner(data);
      return push_path(_pipe, reverse(position));
    } else {
      let key = path2.head;
      let path$1 = path2.tail;
      let $ = index2(data, key);
      if ($ instanceof Ok) {
        let $1 = $[0];
        if ($1 instanceof Some) {
          let data$1 = $1[0];
          loop$path = path$1;
          loop$position = prepend(key, position);
          loop$inner = inner;
          loop$data = data$1;
          loop$handle_miss = handle_miss;
        } else {
          return handle_miss(data, prepend(key, position));
        }
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$;
        default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$;
          default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
      let out;
      let errors1;
      out = $[0];
      errors1 = $[1];
      let $1 = next(out).function(data);
      let out$1;
      let errors2;
      out$1 = $1[0];
      errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function to_string(term) {
  return term.toString();
}
function string_length(string5) {
  if (string5 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string5.match(/./gsu).length;
  }
}
var segmenter = void 0;
function graphemes_iterator(string5) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string5)[Symbol.iterator]();
  }
}
function pop_grapheme(string5) {
  let first2;
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string5.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string5.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function uppercase(string5) {
  return string5.toUpperCase();
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function random_uniform() {
  const random_uniform_result = Math.random();
  if (random_uniform_result === 1) {
    return random_uniform();
  }
  return random_uniform_result;
}
function new_map() {
  return Dict.new();
}
function map_get(map4, key) {
  const value2 = map4.get(key, NOT_FOUND);
  if (value2 === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value2);
}
function map_insert(key, value2, map4) {
  return map4.set(key, value2);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Array`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Nil";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token2 = {};
    const entry = data.get(key, token2);
    if (entry === token2) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value2 of data) {
      if (i === key) return new Ok(new Some(value2));
      i++;
    }
    return new Error("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error(key_is_int ? "Indexable" : "Dict");
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
}

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function compare(a2, b) {
  let $ = a2 === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = a2 < b;
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function is_ok(result) {
  if (result instanceof Ok) {
    return true;
  } else {
    return false;
  }
}
function unwrap(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function identity3(x) {
  return x;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
function bool(input) {
  return identity3(input);
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$() {
  return new Set2(new_map());
}
function contains(set, member) {
  let _pipe = set.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function insert2(set, member) {
  return new Set2(insert(set.dict, member, token));
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var EMPTY_DICT = /* @__PURE__ */ Dict.new();
var EMPTY_SET = /* @__PURE__ */ new$();
var empty_dict = () => EMPTY_DICT;
var empty_set = () => EMPTY_SET;
var document2 = () => globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var DOCUMENT_FRAGMENT_NODE = 11;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare3(a2, b) {
  if (a2.name === b.name) {
    return EQ;
  } else if (a2.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
};
var Property = class extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.debounce = debounce;
    this.throttle = throttle;
  }
};
var Handler = class extends CustomType {
  constructor(prevent_default, stop_propagation, message) {
    super();
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.message = message;
  }
};
var Never = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes instanceof Empty) {
      return merged;
    } else {
      let $ = attributes.head;
      if ($ instanceof Attribute) {
        let $1 = $.name;
        if ($1 === "") {
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = merged;
        } else if ($1 === "class") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "class") {
                  let kind = $.kind;
                  let class1 = $2;
                  let rest = $3.tail;
                  let class2 = $4.value;
                  let value2 = class1 + " " + class2;
                  let attribute$1 = new Attribute(kind, "class", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else if ($1 === "style") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "style") {
                  let kind = $.kind;
                  let style1 = $2;
                  let rest = $3.tail;
                  let style2 = $4.value;
                  let value2 = style1 + ";" + style2;
                  let attribute$1 = new Attribute(kind, "style", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else {
          let attribute$1 = $;
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = prepend(attribute$1, merged);
        }
      } else {
        let attribute$1 = $;
        let rest = attributes.tail;
        loop$attributes = rest;
        loop$merged = prepend(attribute$1, merged);
      }
    }
  }
}
function prepare(attributes) {
  if (attributes instanceof Empty) {
    return attributes;
  } else {
    let $ = attributes.tail;
    if ($ instanceof Empty) {
      return attributes;
    } else {
      let _pipe = attributes;
      let _pipe$1 = sort(_pipe, (a2, b) => {
        return compare3(b, a2);
      });
      return merge(_pipe$1, empty_list);
    }
  }
}
var attribute_kind = 0;
function attribute(name, value2) {
  return new Attribute(attribute_kind, name, value2);
}
var property_kind = 1;
function property(name, value2) {
  return new Property(property_kind, name, value2);
}
var event_kind = 2;
function event(name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
  return new Event2(
    event_kind,
    name,
    handler,
    include,
    prevent_default,
    stop_propagation,
    immediate2,
    debounce,
    throttle
  );
}
var never_kind = 0;
var never = /* @__PURE__ */ new Never(never_kind);
var always_kind = 2;

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value2) {
  return attribute(name, value2);
}
function property2(name, value2) {
  return property(name, value2);
}
function boolean_attribute(name, value2) {
  if (value2) {
    return attribute2(name, "");
  } else {
    return property2(name, bool(false));
  }
}
function class$(name) {
  return attribute2("class", name);
}
function id(value2) {
  return attribute2("id", value2);
}
function href(url) {
  return attribute2("href", url);
}
function selected(is_selected) {
  return boolean_attribute("selected", is_selected);
}
function value(control_value) {
  return attribute2("value", control_value);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint2) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint2;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function after_paint(effect) {
  let task = (actions) => {
    let root3 = actions.root();
    let dispatch = actions.dispatch;
    return effect(dispatch, root3);
  };
  return new Effect(empty.synchronous, empty.before_paint, toList([task]));
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get(map4, key) {
  const value2 = map4?.get(key);
  if (value2 != null) {
    return new Ok(value2);
  } else {
    return new Error(void 0);
  }
}
function insert3(map4, key, value2) {
  map4 ??= /* @__PURE__ */ new Map();
  map4.set(key, value2);
  return map4;
}
function remove(map4, key) {
  map4?.delete(key);
  return map4;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index4, parent) {
    super();
    this.index = index4;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path2 = loop$path;
    let candidates = loop$candidates;
    if (candidates instanceof Empty) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path2, candidate);
      if ($) {
        return $;
      } else {
        loop$path = path2;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index4, key) {
  if (key === "") {
    return new Index(index4, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_element = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path2 = loop$path;
    let acc = loop$acc;
    if (path2 instanceof Root) {
      if (acc instanceof Empty) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path2 instanceof Key) {
      let key = path2.key;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(separator_element, prepend(key, acc));
    } else {
      let index4 = path2.index;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_element,
        prepend(to_string(index4), acc)
      );
    }
  }
}
function to_string2(path2) {
  return do_to_string(path2, toList([]));
}
function matches(path2, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string2(path2), candidates);
  }
}
var separator_event = "\n";
function event2(path2, event4) {
  return do_to_string(path2, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children, children_count) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
    this.children_count = children_count;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace2) {
  if (namespace2 === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function advance(node) {
  if (node instanceof Fragment) {
    let children_count = node.children_count;
    return 1 + children_count;
  } else {
    return 1;
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children, children_count) {
  return new Fragment(
    fragment_kind,
    key,
    mapper,
    children,
    keyed_children,
    children_count
  );
}
var element_kind = 1;
function element(key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace2,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace2)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;
function set_fragment_key(loop$key, loop$children, loop$index, loop$new_children, loop$keyed_children) {
  while (true) {
    let key = loop$key;
    let children = loop$children;
    let index4 = loop$index;
    let new_children = loop$new_children;
    let keyed_children = loop$keyed_children;
    if (children instanceof Empty) {
      return [reverse(new_children), keyed_children];
    } else {
      let $ = children.head;
      if ($ instanceof Fragment) {
        let node = $;
        if (node.key === "") {
          let children$1 = children.tail;
          let child_key = key + "::" + to_string(index4);
          let $1 = set_fragment_key(
            child_key,
            node.children,
            0,
            empty_list,
            empty2()
          );
          let node_children;
          let node_keyed_children;
          node_children = $1[0];
          node_keyed_children = $1[1];
          let new_node = new Fragment(
            node.kind,
            node.key,
            node.mapper,
            node_children,
            node_keyed_children,
            node.children_count
          );
          let new_children$1 = prepend(new_node, new_children);
          let index$1 = index4 + 1;
          loop$key = key;
          loop$children = children$1;
          loop$index = index$1;
          loop$new_children = new_children$1;
          loop$keyed_children = keyed_children;
        } else {
          let node$1 = $;
          if (node$1.key !== "") {
            let children$1 = children.tail;
            let child_key = key + "::" + node$1.key;
            let keyed_node = to_keyed(child_key, node$1);
            let new_children$1 = prepend(keyed_node, new_children);
            let keyed_children$1 = insert3(
              keyed_children,
              child_key,
              keyed_node
            );
            let index$1 = index4 + 1;
            loop$key = key;
            loop$children = children$1;
            loop$index = index$1;
            loop$new_children = new_children$1;
            loop$keyed_children = keyed_children$1;
          } else {
            let node$2 = $;
            let children$1 = children.tail;
            let new_children$1 = prepend(node$2, new_children);
            let index$1 = index4 + 1;
            loop$key = key;
            loop$children = children$1;
            loop$index = index$1;
            loop$new_children = new_children$1;
            loop$keyed_children = keyed_children;
          }
        }
      } else {
        let node = $;
        if (node.key !== "") {
          let children$1 = children.tail;
          let child_key = key + "::" + node.key;
          let keyed_node = to_keyed(child_key, node);
          let new_children$1 = prepend(keyed_node, new_children);
          let keyed_children$1 = insert3(
            keyed_children,
            child_key,
            keyed_node
          );
          let index$1 = index4 + 1;
          loop$key = key;
          loop$children = children$1;
          loop$index = index$1;
          loop$new_children = new_children$1;
          loop$keyed_children = keyed_children$1;
        } else {
          let node$1 = $;
          let children$1 = children.tail;
          let new_children$1 = prepend(node$1, new_children);
          let index$1 = index4 + 1;
          loop$key = key;
          loop$children = children$1;
          loop$index = index$1;
          loop$new_children = new_children$1;
          loop$keyed_children = keyed_children;
        }
      }
    }
  }
}
function to_keyed(key, node) {
  if (node instanceof Fragment) {
    let children = node.children;
    let $ = set_fragment_key(
      key,
      children,
      0,
      empty_list,
      empty2()
    );
    let children$1;
    let keyed_children;
    children$1 = $[0];
    keyed_children = $[1];
    return new Fragment(
      node.kind,
      key,
      node.mapper,
      children$1,
      keyed_children,
      node.children_count
    );
  } else if (node instanceof Element) {
    return new Element(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.children,
      node.keyed_children,
      node.self_closing,
      node.void
    );
  } else if (node instanceof Text) {
    return new Text(node.kind, key, node.mapper, node.content);
  } else {
    return new UnsafeInnerHtml(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.inner_html
    );
  }
}

// build/dev/javascript/lustre/lustre/internals/equals.ffi.mjs
var isReferenceEqual = (a2, b) => a2 === b;
var isEqual2 = (a2, b) => {
  if (a2 === b) {
    return true;
  }
  if (a2 == null || b == null) {
    return false;
  }
  const type = typeof a2;
  if (type !== typeof b) {
    return false;
  }
  if (type !== "object") {
    return false;
  }
  const ctor = a2.constructor;
  if (ctor !== b.constructor) {
    return false;
  }
  if (Array.isArray(a2)) {
    return areArraysEqual(a2, b);
  }
  return areObjectsEqual(a2, b);
};
var areArraysEqual = (a2, b) => {
  let index4 = a2.length;
  if (index4 !== b.length) {
    return false;
  }
  while (index4--) {
    if (!isEqual2(a2[index4], b[index4])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a2, b) => {
  const properties = Object.keys(a2);
  let index4 = properties.length;
  if (Object.keys(b).length !== index4) {
    return false;
  }
  while (index4--) {
    const property3 = properties[index4];
    if (!Object.hasOwn(b, property3)) {
      return false;
    }
    if (!isEqual2(a2[property3], b[property3])) {
      return false;
    }
  }
  return true;
};

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$3() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path2, name) {
  return remove(handlers, event2(path2, name));
}
function remove_event(events, path2, name) {
  let handlers = do_remove_event(events.handlers, path2, name);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function remove_attributes(handlers, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        return do_remove_event(events, path2, name);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path2, name, event4) {
  let next_dispatched_paths = prepend(path2, events.next_dispatched_paths);
  let events$1 = new Events(
    events.handlers,
    events.dispatched_paths,
    next_dispatched_paths
  );
  let $ = get(
    events$1.handlers,
    path2 + separator_event + name
  );
  if ($ instanceof Ok) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path2) {
  return matches(path2, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path2, name, handler) {
  return insert3(
    handlers,
    event2(path2, name),
    map2(
      handler,
      (handler2) => {
        return new Handler(
          handler2.prevent_default,
          handler2.stop_propagation,
          identity2(mapper)(handler2.message)
        );
      }
    )
  );
}
function add_event(events, mapper, path2, name, handler) {
  let handlers = do_add_event(events.handlers, mapper, path2, name, handler);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path2, name, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = isReferenceEqual(mapper, identity2);
  let $1 = isReferenceEqual(child_mapper, identity2);
  if ($1) {
    return mapper;
  } else if ($) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path2;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    return do_remove_children(handlers, parent, child_index + 1, children);
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path2, attributes);
    return do_remove_children(_pipe$1, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path2, attributes);
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path2;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let child_index$1 = child_index + 1;
    return do_add_children(
      handlers,
      composed_mapper,
      parent,
      child_index$1,
      children
    );
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path2, attributes);
    return do_add_children(_pipe$1, composed_mapper, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path2, attributes);
  }
}
function add_child(events, mapper, parent, index4, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index4, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_children(events, mapper, path2, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path2,
    child_index,
    children
  );
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace2, tag, attributes, children) {
  return element(
    "",
    identity2,
    namespace2,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity2, content);
}
function none2() {
  return text("", identity2, "");
}
function count_fragment_children(loop$children, loop$count) {
  while (true) {
    let children = loop$children;
    let count = loop$count;
    if (children instanceof Empty) {
      return count;
    } else {
      let child = children.head;
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + advance(child);
    }
  }
}
function fragment2(children) {
  return fragment(
    "",
    identity2,
    children,
    empty2(),
    count_fragment_children(children, 0)
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function h1(attrs, children) {
  return element2("h1", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function option(attrs, label) {
  return element2("option", attrs, toList([text2(label)]));
}
function select(attrs, children) {
  return element2("select", attrs, children);
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index4, removed, changes, children) {
    super();
    this.index = index4;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
    this.count = count;
  }
};
var RemoveKey = class extends CustomType {
  constructor(kind, key, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.count = count;
  }
};
var Replace = class extends CustomType {
  constructor(kind, from, count, with$) {
    super();
    this.kind = kind;
    this.from = from;
    this.count = count;
    this.with = with$;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
var Remove = class extends CustomType {
  constructor(kind, from, count) {
    super();
    this.kind = kind;
    this.from = from;
    this.count = count;
  }
};
function new$5(index4, removed, changes, children) {
  return new Patch(index4, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before, count) {
  return new Move(move_kind, key, before, count);
}
var remove_key_kind = 4;
function remove_key(key, count) {
  return new RemoveKey(remove_key_kind, key, count);
}
var replace_kind = 5;
function replace2(from, count, with$) {
  return new Replace(replace_kind, from, count, with$);
}
var insert_kind = 6;
function insert4(children, before) {
  return new Insert(insert_kind, children, before);
}
var remove_kind = 7;
function remove2(from, count) {
  return new Remove(remove_kind, from, count);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace2, tag, path2) {
  if (tag === "input" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "select" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "textarea" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path2 = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$8 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (new$8 instanceof Empty) {
      if (old instanceof Empty) {
        return new AttributeChange(added, removed, events);
      } else {
        let $ = old.head;
        if ($ instanceof Event2) {
          let prev = $;
          let old$1 = old.tail;
          let name = $.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = old$1;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let prev = $;
          let old$1 = old.tail;
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = old$1;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        }
      }
    } else if (old instanceof Empty) {
      let $ = new$8.head;
      if ($ instanceof Event2) {
        let next = $;
        let new$1 = new$8.tail;
        let name = $.name;
        let handler = $.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let next = $;
        let new$1 = new$8.tail;
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      }
    } else {
      let next = new$8.head;
      let remaining_new = new$8.tail;
      let prev = old.head;
      let remaining_old = old.tail;
      let $ = compare3(prev, next);
      if ($ instanceof Lt) {
        if (prev instanceof Event2) {
          let name = prev.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = remaining_old;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        }
      } else if ($ instanceof Eq) {
        if (next instanceof Attribute) {
          if (prev instanceof Attribute) {
            let _block;
            let $1 = next.name;
            if ($1 === "value") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "checked") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "selected") {
              _block = controlled || prev.value !== next.value;
            } else {
              _block = prev.value !== next.value;
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (next instanceof Property) {
          if (prev instanceof Property) {
            let _block;
            let $1 = next.name;
            if ($1 === "scrollLeft") {
              _block = true;
            } else if ($1 === "scrollRight") {
              _block = true;
            } else if ($1 === "value") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "checked") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "selected") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else {
              _block = !isEqual2(prev.value, next.value);
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (prev instanceof Event2) {
          let name = next.name;
          let handler = next.handler;
          let has_changes = !isEqual(
            prev.prevent_default,
            next.prevent_default
          ) || !isEqual(prev.stop_propagation, next.stop_propagation) || prev.immediate !== next.immediate || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
          let _block;
          if (has_changes) {
            _block = prepend(next, added);
          } else {
            _block = added;
          }
          let added$1 = _block;
          let events$1 = add_event(events, mapper, path2, name, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let name = next.name;
          let handler = next.handler;
          let added$1 = prepend(next, added);
          let removed$1 = prepend(prev, removed);
          let events$1 = add_event(events, mapper, path2, name, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed$1;
        }
      } else if (next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$8 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path2 = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (new$8 instanceof Empty) {
      if (old instanceof Empty) {
        return new Diff(
          new Patch(patch_index, removed, changes, children),
          events
        );
      } else {
        let prev = old.head;
        let old$1 = old.tail;
        let _block;
        let $ = prev.key === "" || !contains(moved, prev.key);
        if ($) {
          _block = removed + advance(prev);
        } else {
          _block = removed;
        }
        let removed$1 = _block;
        let events$1 = remove_child(events, path2, node_index, prev);
        loop$old = old$1;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset;
        loop$removed = removed$1;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old instanceof Empty) {
      let events$1 = add_children(
        events,
        mapper,
        path2,
        node_index,
        new$8
      );
      let insert5 = insert4(new$8, node_index - moved_offset);
      let changes$1 = prepend(insert5, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else {
      let next = new$8.head;
      let prev = old.head;
      if (prev.key !== next.key) {
        let new_remaining = new$8.tail;
        let old_remaining = old.tail;
        let next_did_exist = get(old_keyed, next.key);
        let prev_does_exist = get(new_keyed, prev.key);
        let prev_has_moved = contains(moved, prev.key);
        if (next_did_exist instanceof Ok) {
          if (prev_does_exist instanceof Ok) {
            if (prev_has_moved) {
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new$8;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - advance(prev);
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let match = next_did_exist[0];
              let count = advance(next);
              let before = node_index - moved_offset;
              let move2 = move(next.key, before, count);
              let changes$1 = prepend(move2, changes);
              let moved$1 = insert2(moved, next.key);
              let moved_offset$1 = moved_offset + count;
              loop$old = prepend(match, old);
              loop$old_keyed = old_keyed;
              loop$new = new$8;
              loop$new_keyed = new_keyed;
              loop$moved = moved$1;
              loop$moved_offset = moved_offset$1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes$1;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let count = advance(prev);
            let moved_offset$1 = moved_offset - count;
            let events$1 = remove_child(events, path2, node_index, prev);
            let remove3 = remove_key(prev.key, count);
            let changes$1 = prepend(remove3, changes);
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new$8;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset$1;
            loop$removed = removed;
            loop$node_index = node_index;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes$1;
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if (prev_does_exist instanceof Ok) {
          let before = node_index - moved_offset;
          let count = advance(next);
          let events$1 = add_child(
            events,
            mapper,
            path2,
            node_index,
            next
          );
          let insert5 = insert4(toList([next]), before);
          let changes$1 = prepend(insert5, changes);
          loop$old = old;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset + count;
          loop$removed = removed;
          loop$node_index = node_index + count;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = changes$1;
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        } else {
          let prev_count = advance(prev);
          let next_count = advance(next);
          let change = replace2(
            node_index - moved_offset,
            prev_count,
            next
          );
          let _block;
          let _pipe = events;
          let _pipe$1 = remove_child(_pipe, path2, node_index, prev);
          _block = add_child(_pipe$1, mapper, path2, node_index, next);
          let events$1 = _block;
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset - prev_count + next_count;
          loop$removed = removed;
          loop$node_index = node_index + next_count;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = prepend(change, changes);
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        }
      } else {
        let $ = old.head;
        if ($ instanceof Fragment) {
          let $1 = new$8.head;
          if ($1 instanceof Fragment) {
            let next$1 = $1;
            let new$1 = new$8.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let node_index$1 = node_index + 1;
            let prev_count = prev$1.children_count;
            let next_count = next$1.children_count;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child = do_diff(
              prev$1.children,
              prev$1.keyed_children,
              next$1.children,
              next$1.keyed_children,
              empty_set(),
              moved_offset,
              0,
              node_index$1,
              -1,
              path2,
              empty_list,
              children,
              composed_mapper,
              events
            );
            let _block;
            let $2 = child.patch.removed > 0;
            if ($2) {
              let remove_from = node_index$1 + next_count - moved_offset;
              let patch = remove2(remove_from, child.patch.removed);
              _block = append(
                child.patch.changes,
                prepend(patch, changes)
              );
            } else {
              _block = append(child.patch.changes, changes);
            }
            let changes$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset + next_count - prev_count;
            loop$removed = removed;
            loop$node_index = node_index$1 + next_count;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes$1;
            loop$children = child.patch.children;
            loop$mapper = mapper;
            loop$events = child.events;
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let prev_count = advance(prev$1);
            let next_count = advance(next$1);
            let change = replace2(
              node_index - moved_offset,
              prev_count,
              next$1
            );
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset - prev_count + next_count;
            loop$removed = removed;
            loop$node_index = node_index + next_count;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Element) {
          let $1 = new$8.head;
          if ($1 instanceof Element) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.namespace === next$1.namespace && prev$1.tag === next$1.tag) {
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              let composed_mapper = compose_mapper(
                mapper,
                next$1.mapper
              );
              let child_path = add2(path2, node_index, next$1.key);
              let controlled = is_controlled(
                events,
                next$1.namespace,
                next$1.tag,
                child_path
              );
              let $2 = diff_attributes(
                controlled,
                child_path,
                composed_mapper,
                events,
                prev$1.attributes,
                next$1.attributes,
                empty_list,
                empty_list
              );
              let added_attrs;
              let removed_attrs;
              let events$1;
              added_attrs = $2.added;
              removed_attrs = $2.removed;
              events$1 = $2.events;
              let _block;
              if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
                _block = empty_list;
              } else {
                _block = toList([update(added_attrs, removed_attrs)]);
              }
              let initial_child_changes = _block;
              let child = do_diff(
                prev$1.children,
                prev$1.keyed_children,
                next$1.children,
                next$1.keyed_children,
                empty_set(),
                0,
                0,
                0,
                node_index,
                child_path,
                initial_child_changes,
                empty_list,
                composed_mapper,
                events$1
              );
              let _block$1;
              let $3 = child.patch;
              let $4 = $3.children;
              if ($4 instanceof Empty) {
                let $5 = $3.changes;
                if ($5 instanceof Empty) {
                  let $6 = $3.removed;
                  if ($6 === 0) {
                    _block$1 = children;
                  } else {
                    _block$1 = prepend(child.patch, children);
                  }
                } else {
                  _block$1 = prepend(child.patch, children);
                }
              } else {
                _block$1 = prepend(child.patch, children);
              }
              let children$1 = _block$1;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children$1;
              loop$mapper = mapper;
              loop$events = child.events;
            } else {
              let next$2 = $1;
              let new_remaining = new$8.tail;
              let prev$2 = $;
              let old_remaining = old.tail;
              let prev_count = advance(prev$2);
              let next_count = advance(next$2);
              let change = replace2(
                node_index - moved_offset,
                prev_count,
                next$2
              );
              let _block;
              let _pipe = events;
              let _pipe$1 = remove_child(
                _pipe,
                path2,
                node_index,
                prev$2
              );
              _block = add_child(
                _pipe$1,
                mapper,
                path2,
                node_index,
                next$2
              );
              let events$1 = _block;
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new_remaining;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - prev_count + next_count;
              loop$removed = removed;
              loop$node_index = node_index + next_count;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = prepend(change, changes);
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events$1;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let prev_count = advance(prev$1);
            let next_count = advance(next$1);
            let change = replace2(
              node_index - moved_offset,
              prev_count,
              next$1
            );
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset - prev_count + next_count;
            loop$removed = removed;
            loop$node_index = node_index + next_count;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Text) {
          let $1 = new$8.head;
          if ($1 instanceof Text) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.content === next$1.content) {
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let next$2 = $1;
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              let child = new$5(
                node_index,
                0,
                toList([replace_text(next$2.content)]),
                empty_list
              );
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = prepend(child, children);
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let prev_count = advance(prev$1);
            let next_count = advance(next$1);
            let change = replace2(
              node_index - moved_offset,
              prev_count,
              next$1
            );
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset - prev_count + next_count;
            loop$removed = removed;
            loop$node_index = node_index + next_count;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else {
          let $1 = new$8.head;
          if ($1 instanceof UnsafeInnerHtml) {
            let next$1 = $1;
            let new$1 = new$8.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child_path = add2(path2, node_index, next$1.key);
            let $2 = diff_attributes(
              false,
              child_path,
              composed_mapper,
              events,
              prev$1.attributes,
              next$1.attributes,
              empty_list,
              empty_list
            );
            let added_attrs;
            let removed_attrs;
            let events$1;
            added_attrs = $2.added;
            removed_attrs = $2.removed;
            events$1 = $2.events;
            let _block;
            if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
              _block = empty_list;
            } else {
              _block = toList([update(added_attrs, removed_attrs)]);
            }
            let child_changes = _block;
            let _block$1;
            let $3 = prev$1.inner_html === next$1.inner_html;
            if ($3) {
              _block$1 = child_changes;
            } else {
              _block$1 = prepend(
                replace_inner_html(next$1.inner_html),
                child_changes
              );
            }
            let child_changes$1 = _block$1;
            let _block$2;
            if (child_changes$1 instanceof Empty) {
              _block$2 = children;
            } else {
              _block$2 = prepend(
                new$5(node_index, 0, child_changes$1, toList([])),
                children
              );
            }
            let children$1 = _block$2;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes;
            loop$children = children$1;
            loop$mapper = mapper;
            loop$events = events$1;
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let prev_count = advance(prev$1);
            let next_count = advance(next$1);
            let change = replace2(
              node_index - moved_offset,
              prev_count,
              next$1
            );
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset - prev_count + next_count;
            loop$removed = removed;
            loop$node_index = node_index + next_count;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        }
      }
    }
  }
}
function diff(events, old, new$8) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$8]),
    empty2(),
    empty_set(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity2,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var Reconciler = class {
  offset = 0;
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  #exposeKeys = false;
  constructor(root3, dispatch, { useServerEvents = false, exposeKeys = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
    this.#exposeKeys = exposeKeys;
  }
  mount(vdom) {
    appendChild(this.#root, this.#createChild(this.#root, 0, vdom));
  }
  #stack = [];
  push(patch) {
    const offset = this.offset;
    if (offset) {
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
          case move_kind:
            change.before = (change.before | 0) + offset;
            break;
          case remove_kind:
          case replace_kind:
            change.from = (change.from | 0) + offset;
            break;
        }
      });
      iterate(patch.children, (child) => {
        child.index = (child.index | 0) + offset;
      });
    }
    this.#stack.push({ node: this.#root, patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #reconcile() {
    const self = this;
    while (self.#stack.length) {
      const { node, patch } = self.#stack.pop();
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
            self.#insert(node, change.children, change.before);
            break;
          case move_kind:
            self.#move(node, change.key, change.before, change.count);
            break;
          case remove_key_kind:
            self.#removeKey(node, change.key, change.count);
            break;
          case remove_kind:
            self.#remove(node, change.from, change.count);
            break;
          case replace_kind:
            self.#replace(node, change.from, change.count, change.with);
            break;
          case replace_text_kind:
            self.#replaceText(node, change.content);
            break;
          case replace_inner_html_kind:
            self.#replaceInnerHtml(node, change.inner_html);
            break;
          case update_kind:
            self.#update(node, change.added, change.removed);
            break;
        }
      });
      if (patch.removed) {
        self.#remove(
          node,
          node.childNodes.length - patch.removed,
          patch.removed
        );
      }
      let lastIndex = -1;
      let lastChild = null;
      iterate(patch.children, (child) => {
        const index4 = child.index | 0;
        const next = lastChild && lastIndex - index4 === 1 ? lastChild.previousSibling : childAt(node, index4);
        self.#stack.push({ node: next, patch: child });
        lastChild = next;
        lastIndex = index4;
      });
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(node, children, before) {
    const fragment3 = createDocumentFragment();
    let childIndex = before | 0;
    iterate(children, (child) => {
      const el = this.#createChild(node, childIndex, child);
      appendChild(fragment3, el);
      childIndex += advance(child);
    });
    insertBefore(node, fragment3, childAt(node, before));
  }
  #move(node, key, before, count) {
    let el = getKeyedChild(node, key);
    const beforeEl = childAt(node, before);
    for (let i = 0; i < count && el !== null; ++i) {
      const next = el.nextSibling;
      if (SUPPORTS_MOVE_BEFORE) {
        node.moveBefore(el, beforeEl);
      } else {
        insertBefore(node, el, beforeEl);
      }
      el = next;
    }
  }
  #removeKey(node, key, count) {
    this.#removeFromChild(node, getKeyedChild(node, key), count);
  }
  #remove(node, from, count) {
    this.#removeFromChild(node, childAt(node, from), count);
  }
  #removeFromChild(parent, child, count) {
    while (count-- > 0 && child !== null) {
      const next = child.nextSibling;
      const key = child[meta].key;
      if (key) {
        parent[meta].keyedChildren.delete(key);
      }
      for (const [_, { timeout }] of child[meta].debouncers ?? []) {
        clearTimeout(timeout);
      }
      parent.removeChild(child);
      child = next;
    }
  }
  #replace(parent, from, count, child) {
    this.#remove(parent, from, count);
    const el = this.#createChild(parent, from, child);
    insertBefore(parent, el, childAt(parent, from));
  }
  #replaceText(node, content) {
    node.data = content ?? "";
  }
  #replaceInnerHtml(node, inner_html) {
    node.innerHTML = inner_html ?? "";
  }
  #update(node, added, removed) {
    iterate(removed, (attribute3) => {
      const name = attribute3.name;
      if (node[meta].handlers.has(name)) {
        node.removeEventListener(name, handleEvent);
        node[meta].handlers.delete(name);
        if (node[meta].throttles.has(name)) {
          node[meta].throttles.delete(name);
        }
        if (node[meta].debouncers.has(name)) {
          clearTimeout(node[meta].debouncers.get(name).timeout);
          node[meta].debouncers.delete(name);
        }
      } else {
        node.removeAttribute(name);
        SYNCED_ATTRIBUTES[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => {
      this.#createAttribute(node, attribute3);
    });
  }
  // CONSTRUCTORS --------------------------------------------------------------
  #createChild(parent, index4, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = createChildElement(parent, index4, vnode);
        this.#createAttributes(node, vnode);
        this.#insert(node, vnode.children);
        return node;
      }
      case text_kind: {
        return createChildText(parent, index4, vnode);
      }
      case fragment_kind: {
        const node = createDocumentFragment();
        const head = createChildText(parent, index4, vnode);
        appendChild(node, head);
        let childIndex = index4 + 1;
        iterate(vnode.children, (child) => {
          appendChild(node, this.#createChild(parent, childIndex, child));
          childIndex += advance(child);
        });
        return node;
      }
      case unsafe_inner_html_kind: {
        const node = createChildElement(parent, index4, vnode);
        this.#createAttributes(node, vnode);
        this.#replaceInnerHtml(node, vnode.inner_html);
        return node;
      }
    }
  }
  #createAttributes(node, { key, attributes }) {
    if (this.#exposeKeys && key) {
      node.setAttribute("data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name,
      value: value2,
      prevent_default: prevent,
      stop_propagation: stop,
      immediate: immediate2,
      include,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value2 ?? "";
        if (name === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        }
        if (valueOrDefault !== node.getAttribute(name)) {
          node.setAttribute(name, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name]?.added?.(node, value2);
        break;
      }
      case property_kind:
        node[name] = value2;
        break;
      case event_kind: {
        if (handlers.has(name)) {
          node.removeEventListener(name, handleEvent);
        }
        node.addEventListener(name, handleEvent, {
          passive: prevent.kind === never_kind
        });
        if (throttleDelay > 0) {
          const throttle = throttles.get(name) ?? {};
          throttle.delay = throttleDelay;
          throttles.set(name, throttle);
        } else {
          throttles.delete(name);
        }
        if (debounceDelay > 0) {
          const debounce = debouncers.get(name) ?? {};
          debounce.delay = debounceDelay;
          debouncers.set(name, debounce);
        } else {
          clearTimeout(debouncers.get(name)?.timeout);
          debouncers.delete(name);
        }
        handlers.set(name, (event4) => {
          if (prevent.kind === always_kind) event4.preventDefault();
          if (stop.kind === always_kind) event4.stopPropagation();
          const type = event4.type;
          const path2 = event4.currentTarget[meta].path;
          const data = this.#useServerEvents ? createServerEvent(event4, include ?? []) : event4;
          const throttle = throttles.get(type);
          if (throttle) {
            const now = Date.now();
            const last = throttle.last || 0;
            if (now > last + throttle.delay) {
              throttle.last = now;
              throttle.lastEvent = event4;
              this.#dispatch(data, path2, type, immediate2);
            }
          }
          const debounce = debouncers.get(type);
          if (debounce) {
            clearTimeout(debounce.timeout);
            debounce.timeout = setTimeout(() => {
              if (event4 === throttles.get(type)?.lastEvent) return;
              this.#dispatch(data, path2, type, immediate2);
            }, debounce.delay);
          }
          if (!throttle && !debounce) {
            this.#dispatch(data, path2, type, immediate2);
          }
        });
        break;
      }
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.tail; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var appendChild = (node, child) => node.appendChild(child);
var insertBefore = (parent, node, referenceNode) => parent.insertBefore(node, referenceNode ?? null);
var createChildElement = (parent, index4, { key, tag, namespace: namespace2 }) => {
  const node = document2().createElementNS(namespace2 || NAMESPACE_HTML, tag);
  initialiseMetadata(parent, node, index4, key);
  return node;
};
var createChildText = (parent, index4, { key, content }) => {
  const node = document2().createTextNode(content ?? "");
  initialiseMetadata(parent, node, index4, key);
  return node;
};
var createDocumentFragment = () => document2().createDocumentFragment();
var childAt = (node, at) => node.childNodes[at | 0];
var meta = Symbol("lustre");
var initialiseMetadata = (parent, node, index4 = 0, key = "") => {
  const segment = `${key || index4}`;
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node[meta] = {
        key,
        path: segment,
        keyedChildren: /* @__PURE__ */ new Map(),
        handlers: /* @__PURE__ */ new Map(),
        throttles: /* @__PURE__ */ new Map(),
        debouncers: /* @__PURE__ */ new Map()
      };
      break;
    case TEXT_NODE:
      node[meta] = { key };
      break;
  }
  if (parent && parent[meta] && key) {
    parent[meta].keyedChildren.set(key, new WeakRef(node));
  }
  if (parent && parent[meta] && parent[meta].path) {
    node[meta].path = `${parent[meta].path}${separator_element}${segment}`;
  }
};
var getKeyedChild = (node, key) => node[meta].keyedChildren.get(key).deref();
var handleEvent = (event4) => {
  const target = event4.currentTarget;
  const handler = target[meta].handlers.get(event4.type);
  if (event4.type === "submit") {
    event4.detail ??= {};
    event4.detail.formData = [...new FormData(event4.target).entries()];
  }
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property3 of include) {
    const path2 = property3.split(".");
    for (let i = 0, input = event4, output = data; i < path2.length; i++) {
      if (i === path2.length - 1) {
        output[path2[i]] = input[path2[i]];
        break;
      }
      output = output[path2[i]] ??= {};
      input = input[path2[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = (name) => {
  return {
    added(node, value2) {
      node[name] = value2;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => node.focus?.());
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const vdom = virtualiseNode(null, root3, "");
  if (vdom === null || vdom.children instanceof Empty) {
    const empty3 = emptyTextNode(root3);
    root3.appendChild(empty3);
    return none2();
  } else if (vdom.children instanceof NonEmpty && vdom.children.tail instanceof Empty) {
    return vdom.children.head;
  } else {
    const head = emptyTextNode(root3);
    root3.insertBefore(head, root3.firstChild);
    return fragment2(vdom.children);
  }
};
var emptyTextNode = (parent) => {
  const node = document2().createTextNode("");
  initialiseMetadata(parent, node);
  return node;
};
var virtualiseNode = (parent, node, index4) => {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const key = node.getAttribute("data-lustre-key");
      initialiseMetadata(parent, node, index4, key);
      if (key) {
        node.removeAttribute("data-lustre-key");
      }
      const tag = node.localName;
      const namespace2 = node.namespaceURI;
      const isHtmlElement = !namespace2 || namespace2 === NAMESPACE_HTML;
      if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
        virtualiseInputEvents(tag, node);
      }
      const attributes = virtualiseAttributes(node);
      const children = virtualiseChildNodes(node);
      const vnode = isHtmlElement ? element2(tag, attributes, children) : namespaced(namespace2, tag, attributes, children);
      return key ? to_keyed(key, vnode) : vnode;
    }
    case TEXT_NODE:
      initialiseMetadata(parent, node, index4);
      return node.data ? text2(node.data) : null;
    case DOCUMENT_FRAGMENT_NODE:
      initialiseMetadata(parent, node, index4);
      return node.childNodes.length > 0 ? fragment2(virtualiseChildNodes(node)) : null;
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2) return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2().activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualiseChildNodes = (node) => {
  let children = null;
  let index4 = 0;
  let child = node.firstChild;
  let ptr = null;
  while (child) {
    const vnode = virtualiseNode(node, child, index4);
    const next = child.nextSibling;
    if (vnode) {
      const list_node = new NonEmpty(vnode, null);
      if (ptr) {
        ptr = ptr.tail = list_node;
      } else {
        ptr = children = list_node;
      }
      index4 += 1;
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  if (!ptr) return empty_list;
  ptr.tail = empty_list;
  return children;
};
var virtualiseAttributes = (node) => {
  let index4 = node.attributes.length;
  let attributes = empty_list;
  while (index4-- > 0) {
    attributes = new NonEmpty(
      virtualiseAttribute(node.attributes[index4]),
      attributes
    );
  }
  return attributes;
};
var virtualiseAttribute = (attr) => {
  const name = attr.localName;
  const value2 = attr.value;
  return attribute2(name, value2);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2();
var Runtime = class {
  constructor(root3, [model, effects], view2, update3) {
    this.root = root3;
    this.#model = model;
    this.#view = view2;
    this.#update = update3;
    this.#reconciler = new Reconciler(this.root, (event4, path2, name) => {
      const [events, result] = handle(this.#events, path2, name, event4);
      this.#events = events;
      if (result.isOk()) {
        const handler = result[0];
        if (handler.stop_propagation) event4.stopPropagation();
        if (handler.prevent_default) event4.preventDefault();
        this.dispatch(handler.message, false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$3();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  set offset(offset) {
    this.#reconciler.offset = offset;
  }
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a2, b) {
  if (a2 instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a2;
  } else {
    return append(a2, b);
  }
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name, data) {
    super();
    this.name = name;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, attributes, properties, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.attributes = attributes;
    this.properties = properties;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$6(options) {
  let init2 = new Config2(
    false,
    true,
    empty_dict(),
    empty_dict(),
    false,
    option_none,
    option_none,
    option_none
  );
  return fold(
    options,
    init2,
    (config, option2) => {
      return option2.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class _Spa {
  static start({ init: init2, update: update3, view: view2 }, selector, flags) {
    if (!is_browser()) return new Error(new NotABrowser());
    const root3 = selector instanceof HTMLElement ? selector : document2().querySelector(selector);
    if (!root3) return new Error(new ElementNotFound(selector));
    return new Ok(new _Spa(root3, init2(flags), update3, view2));
  }
  #runtime;
  constructor(root3, [init2, effects], update3, view2) {
    this.#runtime = new Runtime(root3, [init2, effects], view2, update3);
  }
  send(message) {
    switch (message.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message.name, message.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = Spa.start;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init2, update3, view2, config) {
    super();
    this.init = init2;
    this.update = update3;
    this.view = view2;
    this.config = config;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init2, update3, view2) {
  return new App(init2, update3, view2, new$6(empty_list));
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/svg.mjs
var namespace = "http://www.w3.org/2000/svg";
function rect(attrs) {
  return namespaced(namespace, "rect", attrs, empty_list);
}
function defs(attrs, children) {
  return namespaced(namespace, "defs", attrs, children);
}
function mask2(attrs, children) {
  return namespaced(namespace, "mask", attrs, children);
}
function svg(attrs, children) {
  return namespaced(namespace, "svg", attrs, children);
}
function fe_blend(attrs) {
  return namespaced(namespace, "feBlend", attrs, empty_list);
}
function fe_flood(attrs) {
  return namespaced(namespace, "feFlood", attrs, empty_list);
}
function image(attrs) {
  return namespaced(namespace, "image", attrs, empty_list);
}
function path(attrs) {
  return namespaced(namespace, "path", attrs, empty_list);
}
function tspan(attrs, children) {
  return namespaced(namespace, "tspan", attrs, children);
}

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name) {
  if (name === "input") {
    return true;
  } else if (name === "change") {
    return true;
  } else if (name === "focus") {
    return true;
  } else if (name === "focusin") {
    return true;
  } else if (name === "focusout") {
    return true;
  } else if (name === "blur") {
    return true;
  } else if (name === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name, handler) {
  return event(
    name,
    map2(handler, (msg) => {
      return new Handler(false, false, msg);
    }),
    empty_list,
    never,
    never,
    is_immediate_event(name),
    0,
    0
  );
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_change(msg) {
  return on(
    "change",
    subfield(
      toList(["target", "value"]),
      string2,
      (value2) => {
        return success(msg(value2));
      }
    )
  );
}

// build/dev/javascript/dangenhentschel/dangenhentschel_ffi.mjs
function set_document_hash(hash) {
  document.location.hash = hash;
}
function document_hash() {
  return document.location.hash || "";
}

// build/dev/javascript/dangenhentschel/dangenhentschel.mjs
var FILEPATH = "src/dangenhentschel.gleam";
var Random = class extends CustomType {
};
var UserSetColour = class extends CustomType {
  constructor(hex) {
    super();
    this.hex = hex;
  }
};
var DocumentUpdatedHash = class extends CustomType {
};
var Colour = class extends CustomType {
  constructor(name, hex) {
    super();
    this.name = name;
    this.hex = hex;
  }
};
function update_hash_effect(hash) {
  return after_paint(
    (dispatch, _) => {
      set_document_hash(hash);
      return dispatch(new DocumentUpdatedHash());
    }
  );
}
var colours = /* @__PURE__ */ toList([
  /* @__PURE__ */ new Colour("cloudy blue", "#acc2d9"),
  /* @__PURE__ */ new Colour("dark pastel green", "#56ae57"),
  /* @__PURE__ */ new Colour("dust", "#b2996e"),
  /* @__PURE__ */ new Colour("electric lime", "#a8ff04"),
  /* @__PURE__ */ new Colour("fresh green", "#69d84f"),
  /* @__PURE__ */ new Colour("light eggplant", "#894585"),
  /* @__PURE__ */ new Colour("nasty green", "#70b23f"),
  /* @__PURE__ */ new Colour("really light blue", "#d4ffff"),
  /* @__PURE__ */ new Colour("tea", "#65ab7c"),
  /* @__PURE__ */ new Colour("warm purple", "#952e8f"),
  /* @__PURE__ */ new Colour("yellowish tan", "#fcfc81"),
  /* @__PURE__ */ new Colour("cement", "#a5a391"),
  /* @__PURE__ */ new Colour("dark grass green", "#388004"),
  /* @__PURE__ */ new Colour("dusty teal", "#4c9085"),
  /* @__PURE__ */ new Colour("grey teal", "#5e9b8a"),
  /* @__PURE__ */ new Colour("macaroni and cheese", "#efb435"),
  /* @__PURE__ */ new Colour("pinkish tan", "#d99b82"),
  /* @__PURE__ */ new Colour("spruce", "#0a5f38"),
  /* @__PURE__ */ new Colour("strong blue", "#0c06f7"),
  /* @__PURE__ */ new Colour("toxic green", "#61de2a"),
  /* @__PURE__ */ new Colour("windows blue", "#3778bf"),
  /* @__PURE__ */ new Colour("blue blue", "#2242c7"),
  /* @__PURE__ */ new Colour("blue with a hint of purple", "#533cc6"),
  /* @__PURE__ */ new Colour("booger", "#9bb53c"),
  /* @__PURE__ */ new Colour("bright sea green", "#05ffa6"),
  /* @__PURE__ */ new Colour("dark green blue", "#1f6357"),
  /* @__PURE__ */ new Colour("deep turquoise", "#017374"),
  /* @__PURE__ */ new Colour("green teal", "#0cb577"),
  /* @__PURE__ */ new Colour("strong pink", "#ff0789"),
  /* @__PURE__ */ new Colour("bland", "#afa88b"),
  /* @__PURE__ */ new Colour("deep aqua", "#08787f"),
  /* @__PURE__ */ new Colour("lavender pink", "#dd85d7"),
  /* @__PURE__ */ new Colour("light moss green", "#a6c875"),
  /* @__PURE__ */ new Colour("light seafoam green", "#a7ffb5"),
  /* @__PURE__ */ new Colour("olive yellow", "#c2b709"),
  /* @__PURE__ */ new Colour("pig pink", "#e78ea5"),
  /* @__PURE__ */ new Colour("deep lilac", "#966ebd"),
  /* @__PURE__ */ new Colour("desert", "#ccad60"),
  /* @__PURE__ */ new Colour("dusty lavender", "#ac86a8"),
  /* @__PURE__ */ new Colour("purpley grey", "#947e94"),
  /* @__PURE__ */ new Colour("purply", "#983fb2"),
  /* @__PURE__ */ new Colour("candy pink", "#ff63e9"),
  /* @__PURE__ */ new Colour("light pastel green", "#b2fba5"),
  /* @__PURE__ */ new Colour("boring green", "#63b365"),
  /* @__PURE__ */ new Colour("kiwi green", "#8ee53f"),
  /* @__PURE__ */ new Colour("light grey green", "#b7e1a1"),
  /* @__PURE__ */ new Colour("orange pink", "#ff6f52"),
  /* @__PURE__ */ new Colour("tea green", "#bdf8a3"),
  /* @__PURE__ */ new Colour("very light brown", "#d3b683"),
  /* @__PURE__ */ new Colour("egg shell", "#fffcc4"),
  /* @__PURE__ */ new Colour("eggplant purple", "#430541"),
  /* @__PURE__ */ new Colour("powder pink", "#ffb2d0"),
  /* @__PURE__ */ new Colour("reddish grey", "#997570"),
  /* @__PURE__ */ new Colour("baby shit brown", "#ad900d"),
  /* @__PURE__ */ new Colour("liliac", "#c48efd"),
  /* @__PURE__ */ new Colour("stormy blue", "#507b9c"),
  /* @__PURE__ */ new Colour("ugly brown", "#7d7103"),
  /* @__PURE__ */ new Colour("custard", "#fffd78"),
  /* @__PURE__ */ new Colour("darkish pink", "#da467d"),
  /* @__PURE__ */ new Colour("deep brown", "#410200"),
  /* @__PURE__ */ new Colour("greenish beige", "#c9d179"),
  /* @__PURE__ */ new Colour("manilla", "#fffa86"),
  /* @__PURE__ */ new Colour("off blue", "#5684ae"),
  /* @__PURE__ */ new Colour("battleship grey", "#6b7c85"),
  /* @__PURE__ */ new Colour("browny green", "#6f6c0a"),
  /* @__PURE__ */ new Colour("bruise", "#7e4071"),
  /* @__PURE__ */ new Colour("kelley green", "#009337"),
  /* @__PURE__ */ new Colour("sickly yellow", "#d0e429"),
  /* @__PURE__ */ new Colour("sunny yellow", "#fff917"),
  /* @__PURE__ */ new Colour("azul", "#1d5dec"),
  /* @__PURE__ */ new Colour("darkgreen", "#054907"),
  /* @__PURE__ */ new Colour("green/yellow", "#b5ce08"),
  /* @__PURE__ */ new Colour("lichen", "#8fb67b"),
  /* @__PURE__ */ new Colour("light light green", "#c8ffb0"),
  /* @__PURE__ */ new Colour("pale gold", "#fdde6c"),
  /* @__PURE__ */ new Colour("sun yellow", "#ffdf22"),
  /* @__PURE__ */ new Colour("tan green", "#a9be70"),
  /* @__PURE__ */ new Colour("burple", "#6832e3"),
  /* @__PURE__ */ new Colour("butterscotch", "#fdb147"),
  /* @__PURE__ */ new Colour("toupe", "#c7ac7d"),
  /* @__PURE__ */ new Colour("dark cream", "#fff39a"),
  /* @__PURE__ */ new Colour("indian red", "#850e04"),
  /* @__PURE__ */ new Colour("light lavendar", "#efc0fe"),
  /* @__PURE__ */ new Colour("poison green", "#40fd14"),
  /* @__PURE__ */ new Colour("baby puke green", "#b6c406"),
  /* @__PURE__ */ new Colour("bright yellow green", "#9dff00"),
  /* @__PURE__ */ new Colour("charcoal grey", "#3c4142"),
  /* @__PURE__ */ new Colour("squash", "#f2ab15"),
  /* @__PURE__ */ new Colour("cinnamon", "#ac4f06"),
  /* @__PURE__ */ new Colour("light pea green", "#c4fe82"),
  /* @__PURE__ */ new Colour("radioactive green", "#2cfa1f"),
  /* @__PURE__ */ new Colour("raw sienna", "#9a6200"),
  /* @__PURE__ */ new Colour("baby purple", "#ca9bf7"),
  /* @__PURE__ */ new Colour("cocoa", "#875f42"),
  /* @__PURE__ */ new Colour("light royal blue", "#3a2efe"),
  /* @__PURE__ */ new Colour("orangeish", "#fd8d49"),
  /* @__PURE__ */ new Colour("rust brown", "#8b3103"),
  /* @__PURE__ */ new Colour("sand brown", "#cba560"),
  /* @__PURE__ */ new Colour("swamp", "#698339"),
  /* @__PURE__ */ new Colour("tealish green", "#0cdc73"),
  /* @__PURE__ */ new Colour("burnt siena", "#b75203"),
  /* @__PURE__ */ new Colour("camo", "#7f8f4e"),
  /* @__PURE__ */ new Colour("dusk blue", "#26538d"),
  /* @__PURE__ */ new Colour("fern", "#63a950"),
  /* @__PURE__ */ new Colour("old rose", "#c87f89"),
  /* @__PURE__ */ new Colour("pale light green", "#b1fc99"),
  /* @__PURE__ */ new Colour("peachy pink", "#ff9a8a"),
  /* @__PURE__ */ new Colour("rosy pink", "#f6688e"),
  /* @__PURE__ */ new Colour("light bluish green", "#76fda8"),
  /* @__PURE__ */ new Colour("light bright green", "#53fe5c"),
  /* @__PURE__ */ new Colour("light neon green", "#4efd54"),
  /* @__PURE__ */ new Colour("light seafoam", "#a0febf"),
  /* @__PURE__ */ new Colour("tiffany blue", "#7bf2da"),
  /* @__PURE__ */ new Colour("washed out green", "#bcf5a6"),
  /* @__PURE__ */ new Colour("browny orange", "#ca6b02"),
  /* @__PURE__ */ new Colour("nice blue", "#107ab0"),
  /* @__PURE__ */ new Colour("sapphire", "#2138ab"),
  /* @__PURE__ */ new Colour("greyish teal", "#719f91"),
  /* @__PURE__ */ new Colour("orangey yellow", "#fdb915"),
  /* @__PURE__ */ new Colour("parchment", "#fefcaf"),
  /* @__PURE__ */ new Colour("straw", "#fcf679"),
  /* @__PURE__ */ new Colour("very dark brown", "#1d0200"),
  /* @__PURE__ */ new Colour("terracota", "#cb6843"),
  /* @__PURE__ */ new Colour("ugly blue", "#31668a"),
  /* @__PURE__ */ new Colour("clear blue", "#247afd"),
  /* @__PURE__ */ new Colour("creme", "#ffffb6"),
  /* @__PURE__ */ new Colour("foam green", "#90fda9"),
  /* @__PURE__ */ new Colour("grey/green", "#86a17d"),
  /* @__PURE__ */ new Colour("light gold", "#fddc5c"),
  /* @__PURE__ */ new Colour("seafoam blue", "#78d1b6"),
  /* @__PURE__ */ new Colour("topaz", "#13bbaf"),
  /* @__PURE__ */ new Colour("violet pink", "#fb5ffc"),
  /* @__PURE__ */ new Colour("wintergreen", "#20f986"),
  /* @__PURE__ */ new Colour("yellow tan", "#ffe36e"),
  /* @__PURE__ */ new Colour("dark fuchsia", "#9d0759"),
  /* @__PURE__ */ new Colour("indigo blue", "#3a18b1"),
  /* @__PURE__ */ new Colour("light yellowish green", "#c2ff89"),
  /* @__PURE__ */ new Colour("pale magenta", "#d767ad"),
  /* @__PURE__ */ new Colour("rich purple", "#720058"),
  /* @__PURE__ */ new Colour("sunflower yellow", "#ffda03"),
  /* @__PURE__ */ new Colour("green/blue", "#01c08d"),
  /* @__PURE__ */ new Colour("leather", "#ac7434"),
  /* @__PURE__ */ new Colour("racing green", "#014600"),
  /* @__PURE__ */ new Colour("vivid purple", "#9900fa"),
  /* @__PURE__ */ new Colour("dark royal blue", "#02066f"),
  /* @__PURE__ */ new Colour("hazel", "#8e7618"),
  /* @__PURE__ */ new Colour("muted pink", "#d1768f"),
  /* @__PURE__ */ new Colour("booger green", "#96b403"),
  /* @__PURE__ */ new Colour("canary", "#fdff63"),
  /* @__PURE__ */ new Colour("cool grey", "#95a3a6"),
  /* @__PURE__ */ new Colour("dark taupe", "#7f684e"),
  /* @__PURE__ */ new Colour("darkish purple", "#751973"),
  /* @__PURE__ */ new Colour("true green", "#089404"),
  /* @__PURE__ */ new Colour("coral pink", "#ff6163"),
  /* @__PURE__ */ new Colour("dark sage", "#598556"),
  /* @__PURE__ */ new Colour("dark slate blue", "#214761"),
  /* @__PURE__ */ new Colour("flat blue", "#3c73a8"),
  /* @__PURE__ */ new Colour("mushroom", "#ba9e88"),
  /* @__PURE__ */ new Colour("rich blue", "#021bf9"),
  /* @__PURE__ */ new Colour("dirty purple", "#734a65"),
  /* @__PURE__ */ new Colour("greenblue", "#23c48b"),
  /* @__PURE__ */ new Colour("icky green", "#8fae22"),
  /* @__PURE__ */ new Colour("light khaki", "#e6f2a2"),
  /* @__PURE__ */ new Colour("warm blue", "#4b57db"),
  /* @__PURE__ */ new Colour("dark hot pink", "#d90166"),
  /* @__PURE__ */ new Colour("deep sea blue", "#015482"),
  /* @__PURE__ */ new Colour("carmine", "#9d0216"),
  /* @__PURE__ */ new Colour("dark yellow green", "#728f02"),
  /* @__PURE__ */ new Colour("pale peach", "#ffe5ad"),
  /* @__PURE__ */ new Colour("plum purple", "#4e0550"),
  /* @__PURE__ */ new Colour("golden rod", "#f9bc08"),
  /* @__PURE__ */ new Colour("neon red", "#ff073a"),
  /* @__PURE__ */ new Colour("old pink", "#c77986"),
  /* @__PURE__ */ new Colour("very pale blue", "#d6fffe"),
  /* @__PURE__ */ new Colour("blood orange", "#fe4b03"),
  /* @__PURE__ */ new Colour("grapefruit", "#fd5956"),
  /* @__PURE__ */ new Colour("sand yellow", "#fce166"),
  /* @__PURE__ */ new Colour("clay brown", "#b2713d"),
  /* @__PURE__ */ new Colour("dark blue grey", "#1f3b4d"),
  /* @__PURE__ */ new Colour("flat green", "#699d4c"),
  /* @__PURE__ */ new Colour("light green blue", "#56fca2"),
  /* @__PURE__ */ new Colour("warm pink", "#fb5581"),
  /* @__PURE__ */ new Colour("dodger blue", "#3e82fc"),
  /* @__PURE__ */ new Colour("gross green", "#a0bf16"),
  /* @__PURE__ */ new Colour("ice", "#d6fffa"),
  /* @__PURE__ */ new Colour("metallic blue", "#4f738e"),
  /* @__PURE__ */ new Colour("pale salmon", "#ffb19a"),
  /* @__PURE__ */ new Colour("sap green", "#5c8b15"),
  /* @__PURE__ */ new Colour("algae", "#54ac68"),
  /* @__PURE__ */ new Colour("bluey grey", "#89a0b0"),
  /* @__PURE__ */ new Colour("greeny grey", "#7ea07a"),
  /* @__PURE__ */ new Colour("highlighter green", "#1bfc06"),
  /* @__PURE__ */ new Colour("light light blue", "#cafffb"),
  /* @__PURE__ */ new Colour("light mint", "#b6ffbb"),
  /* @__PURE__ */ new Colour("raw umber", "#a75e09"),
  /* @__PURE__ */ new Colour("vivid blue", "#152eff"),
  /* @__PURE__ */ new Colour("deep lavender", "#8d5eb7"),
  /* @__PURE__ */ new Colour("dull teal", "#5f9e8f"),
  /* @__PURE__ */ new Colour("light greenish blue", "#63f7b4"),
  /* @__PURE__ */ new Colour("mud green", "#606602"),
  /* @__PURE__ */ new Colour("pinky", "#fc86aa"),
  /* @__PURE__ */ new Colour("red wine", "#8c0034"),
  /* @__PURE__ */ new Colour("shit green", "#758000"),
  /* @__PURE__ */ new Colour("tan brown", "#ab7e4c"),
  /* @__PURE__ */ new Colour("darkblue", "#030764"),
  /* @__PURE__ */ new Colour("rosa", "#fe86a4"),
  /* @__PURE__ */ new Colour("lipstick", "#d5174e"),
  /* @__PURE__ */ new Colour("pale mauve", "#fed0fc"),
  /* @__PURE__ */ new Colour("claret", "#680018"),
  /* @__PURE__ */ new Colour("dandelion", "#fedf08"),
  /* @__PURE__ */ new Colour("orangered", "#fe420f"),
  /* @__PURE__ */ new Colour("poop green", "#6f7c00"),
  /* @__PURE__ */ new Colour("ruby", "#ca0147"),
  /* @__PURE__ */ new Colour("dark", "#1b2431"),
  /* @__PURE__ */ new Colour("greenish turquoise", "#00fbb0"),
  /* @__PURE__ */ new Colour("pastel red", "#db5856"),
  /* @__PURE__ */ new Colour("piss yellow", "#ddd618"),
  /* @__PURE__ */ new Colour("bright cyan", "#41fdfe"),
  /* @__PURE__ */ new Colour("dark coral", "#cf524e"),
  /* @__PURE__ */ new Colour("algae green", "#21c36f"),
  /* @__PURE__ */ new Colour("darkish red", "#a90308"),
  /* @__PURE__ */ new Colour("reddy brown", "#6e1005"),
  /* @__PURE__ */ new Colour("blush pink", "#fe828c"),
  /* @__PURE__ */ new Colour("camouflage green", "#4b6113"),
  /* @__PURE__ */ new Colour("lawn green", "#4da409"),
  /* @__PURE__ */ new Colour("putty", "#beae8a"),
  /* @__PURE__ */ new Colour("vibrant blue", "#0339f8"),
  /* @__PURE__ */ new Colour("dark sand", "#a88f59"),
  /* @__PURE__ */ new Colour("purple/blue", "#5d21d0"),
  /* @__PURE__ */ new Colour("saffron", "#feb209"),
  /* @__PURE__ */ new Colour("twilight", "#4e518b"),
  /* @__PURE__ */ new Colour("warm brown", "#964e02"),
  /* @__PURE__ */ new Colour("bluegrey", "#85a3b2"),
  /* @__PURE__ */ new Colour("bubble gum pink", "#ff69af"),
  /* @__PURE__ */ new Colour("duck egg blue", "#c3fbf4"),
  /* @__PURE__ */ new Colour("greenish cyan", "#2afeb7"),
  /* @__PURE__ */ new Colour("petrol", "#005f6a"),
  /* @__PURE__ */ new Colour("royal", "#0c1793"),
  /* @__PURE__ */ new Colour("butter", "#ffff81"),
  /* @__PURE__ */ new Colour("dusty orange", "#f0833a"),
  /* @__PURE__ */ new Colour("off yellow", "#f1f33f"),
  /* @__PURE__ */ new Colour("pale olive green", "#b1d27b"),
  /* @__PURE__ */ new Colour("orangish", "#fc824a"),
  /* @__PURE__ */ new Colour("leaf", "#71aa34"),
  /* @__PURE__ */ new Colour("light blue grey", "#b7c9e2"),
  /* @__PURE__ */ new Colour("dried blood", "#4b0101"),
  /* @__PURE__ */ new Colour("lightish purple", "#a552e6"),
  /* @__PURE__ */ new Colour("rusty red", "#af2f0d"),
  /* @__PURE__ */ new Colour("lavender blue", "#8b88f8"),
  /* @__PURE__ */ new Colour("light grass green", "#9af764"),
  /* @__PURE__ */ new Colour("light mint green", "#a6fbb2"),
  /* @__PURE__ */ new Colour("sunflower", "#ffc512"),
  /* @__PURE__ */ new Colour("velvet", "#750851"),
  /* @__PURE__ */ new Colour("brick orange", "#c14a09"),
  /* @__PURE__ */ new Colour("lightish red", "#fe2f4a"),
  /* @__PURE__ */ new Colour("pure blue", "#0203e2"),
  /* @__PURE__ */ new Colour("twilight blue", "#0a437a"),
  /* @__PURE__ */ new Colour("violet red", "#a50055"),
  /* @__PURE__ */ new Colour("yellowy brown", "#ae8b0c"),
  /* @__PURE__ */ new Colour("carnation", "#fd798f"),
  /* @__PURE__ */ new Colour("muddy yellow", "#bfac05"),
  /* @__PURE__ */ new Colour("dark seafoam green", "#3eaf76"),
  /* @__PURE__ */ new Colour("deep rose", "#c74767"),
  /* @__PURE__ */ new Colour("dusty red", "#b9484e"),
  /* @__PURE__ */ new Colour("grey/blue", "#647d8e"),
  /* @__PURE__ */ new Colour("lemon lime", "#bffe28"),
  /* @__PURE__ */ new Colour("purple/pink", "#d725de"),
  /* @__PURE__ */ new Colour("brown yellow", "#b29705"),
  /* @__PURE__ */ new Colour("purple brown", "#673a3f"),
  /* @__PURE__ */ new Colour("wisteria", "#a87dc2"),
  /* @__PURE__ */ new Colour("banana yellow", "#fafe4b"),
  /* @__PURE__ */ new Colour("lipstick red", "#c0022f"),
  /* @__PURE__ */ new Colour("water blue", "#0e87cc"),
  /* @__PURE__ */ new Colour("brown grey", "#8d8468"),
  /* @__PURE__ */ new Colour("vibrant purple", "#ad03de"),
  /* @__PURE__ */ new Colour("baby green", "#8cff9e"),
  /* @__PURE__ */ new Colour("barf green", "#94ac02"),
  /* @__PURE__ */ new Colour("eggshell blue", "#c4fff7"),
  /* @__PURE__ */ new Colour("sandy yellow", "#fdee73"),
  /* @__PURE__ */ new Colour("cool green", "#33b864"),
  /* @__PURE__ */ new Colour("pale", "#fff9d0"),
  /* @__PURE__ */ new Colour("blue/grey", "#758da3"),
  /* @__PURE__ */ new Colour("hot magenta", "#f504c9"),
  /* @__PURE__ */ new Colour("greyblue", "#77a1b5"),
  /* @__PURE__ */ new Colour("purpley", "#8756e4"),
  /* @__PURE__ */ new Colour("baby shit green", "#889717"),
  /* @__PURE__ */ new Colour("brownish pink", "#c27e79"),
  /* @__PURE__ */ new Colour("dark aquamarine", "#017371"),
  /* @__PURE__ */ new Colour("diarrhea", "#9f8303"),
  /* @__PURE__ */ new Colour("light mustard", "#f7d560"),
  /* @__PURE__ */ new Colour("pale sky blue", "#bdf6fe"),
  /* @__PURE__ */ new Colour("turtle green", "#75b84f"),
  /* @__PURE__ */ new Colour("bright olive", "#9cbb04"),
  /* @__PURE__ */ new Colour("dark grey blue", "#29465b"),
  /* @__PURE__ */ new Colour("greeny brown", "#696006"),
  /* @__PURE__ */ new Colour("lemon green", "#adf802"),
  /* @__PURE__ */ new Colour("light periwinkle", "#c1c6fc"),
  /* @__PURE__ */ new Colour("seaweed green", "#35ad6b"),
  /* @__PURE__ */ new Colour("sunshine yellow", "#fffd37"),
  /* @__PURE__ */ new Colour("ugly purple", "#a442a0"),
  /* @__PURE__ */ new Colour("medium pink", "#f36196"),
  /* @__PURE__ */ new Colour("puke brown", "#947706"),
  /* @__PURE__ */ new Colour("very light pink", "#fff4f2"),
  /* @__PURE__ */ new Colour("viridian", "#1e9167"),
  /* @__PURE__ */ new Colour("bile", "#b5c306"),
  /* @__PURE__ */ new Colour("faded yellow", "#feff7f"),
  /* @__PURE__ */ new Colour("very pale green", "#cffdbc"),
  /* @__PURE__ */ new Colour("vibrant green", "#0add08"),
  /* @__PURE__ */ new Colour("bright lime", "#87fd05"),
  /* @__PURE__ */ new Colour("spearmint", "#1ef876"),
  /* @__PURE__ */ new Colour("light aquamarine", "#7bfdc7"),
  /* @__PURE__ */ new Colour("light sage", "#bcecac"),
  /* @__PURE__ */ new Colour("yellowgreen", "#bbf90f"),
  /* @__PURE__ */ new Colour("baby poo", "#ab9004"),
  /* @__PURE__ */ new Colour("dark seafoam", "#1fb57a"),
  /* @__PURE__ */ new Colour("deep teal", "#00555a"),
  /* @__PURE__ */ new Colour("heather", "#a484ac"),
  /* @__PURE__ */ new Colour("rust orange", "#c45508"),
  /* @__PURE__ */ new Colour("dirty blue", "#3f829d"),
  /* @__PURE__ */ new Colour("fern green", "#548d44"),
  /* @__PURE__ */ new Colour("bright lilac", "#c95efb"),
  /* @__PURE__ */ new Colour("weird green", "#3ae57f"),
  /* @__PURE__ */ new Colour("peacock blue", "#016795"),
  /* @__PURE__ */ new Colour("avocado green", "#87a922"),
  /* @__PURE__ */ new Colour("faded orange", "#f0944d"),
  /* @__PURE__ */ new Colour("grape purple", "#5d1451"),
  /* @__PURE__ */ new Colour("hot green", "#25ff29"),
  /* @__PURE__ */ new Colour("lime yellow", "#d0fe1d"),
  /* @__PURE__ */ new Colour("mango", "#ffa62b"),
  /* @__PURE__ */ new Colour("shamrock", "#01b44c"),
  /* @__PURE__ */ new Colour("bubblegum", "#ff6cb5"),
  /* @__PURE__ */ new Colour("purplish brown", "#6b4247"),
  /* @__PURE__ */ new Colour("vomit yellow", "#c7c10c"),
  /* @__PURE__ */ new Colour("pale cyan", "#b7fffa"),
  /* @__PURE__ */ new Colour("key lime", "#aeff6e"),
  /* @__PURE__ */ new Colour("tomato red", "#ec2d01"),
  /* @__PURE__ */ new Colour("lightgreen", "#76ff7b"),
  /* @__PURE__ */ new Colour("merlot", "#730039"),
  /* @__PURE__ */ new Colour("night blue", "#040348"),
  /* @__PURE__ */ new Colour("purpleish pink", "#df4ec8"),
  /* @__PURE__ */ new Colour("apple", "#6ecb3c"),
  /* @__PURE__ */ new Colour("baby poop green", "#8f9805"),
  /* @__PURE__ */ new Colour("green apple", "#5edc1f"),
  /* @__PURE__ */ new Colour("heliotrope", "#d94ff5"),
  /* @__PURE__ */ new Colour("yellow/green", "#c8fd3d"),
  /* @__PURE__ */ new Colour("almost black", "#070d0d"),
  /* @__PURE__ */ new Colour("cool blue", "#4984b8"),
  /* @__PURE__ */ new Colour("leafy green", "#51b73b"),
  /* @__PURE__ */ new Colour("mustard brown", "#ac7e04"),
  /* @__PURE__ */ new Colour("dusk", "#4e5481"),
  /* @__PURE__ */ new Colour("dull brown", "#876e4b"),
  /* @__PURE__ */ new Colour("frog green", "#58bc08"),
  /* @__PURE__ */ new Colour("vivid green", "#2fef10"),
  /* @__PURE__ */ new Colour("bright light green", "#2dfe54"),
  /* @__PURE__ */ new Colour("fluro green", "#0aff02"),
  /* @__PURE__ */ new Colour("kiwi", "#9cef43"),
  /* @__PURE__ */ new Colour("seaweed", "#18d17b"),
  /* @__PURE__ */ new Colour("navy green", "#35530a"),
  /* @__PURE__ */ new Colour("ultramarine blue", "#1805db"),
  /* @__PURE__ */ new Colour("iris", "#6258c4"),
  /* @__PURE__ */ new Colour("pastel orange", "#ff964f"),
  /* @__PURE__ */ new Colour("yellowish orange", "#ffab0f"),
  /* @__PURE__ */ new Colour("perrywinkle", "#8f8ce7"),
  /* @__PURE__ */ new Colour("tealish", "#24bca8"),
  /* @__PURE__ */ new Colour("dark plum", "#3f012c"),
  /* @__PURE__ */ new Colour("pear", "#cbf85f"),
  /* @__PURE__ */ new Colour("pinkish orange", "#ff724c"),
  /* @__PURE__ */ new Colour("midnight purple", "#280137"),
  /* @__PURE__ */ new Colour("light urple", "#b36ff6"),
  /* @__PURE__ */ new Colour("dark mint", "#48c072"),
  /* @__PURE__ */ new Colour("greenish tan", "#bccb7a"),
  /* @__PURE__ */ new Colour("light burgundy", "#a8415b"),
  /* @__PURE__ */ new Colour("turquoise blue", "#06b1c4"),
  /* @__PURE__ */ new Colour("ugly pink", "#cd7584"),
  /* @__PURE__ */ new Colour("sandy", "#f1da7a"),
  /* @__PURE__ */ new Colour("electric pink", "#ff0490"),
  /* @__PURE__ */ new Colour("muted purple", "#805b87"),
  /* @__PURE__ */ new Colour("mid green", "#50a747"),
  /* @__PURE__ */ new Colour("greyish", "#a8a495"),
  /* @__PURE__ */ new Colour("neon yellow", "#cfff04"),
  /* @__PURE__ */ new Colour("banana", "#ffff7e"),
  /* @__PURE__ */ new Colour("carnation pink", "#ff7fa7"),
  /* @__PURE__ */ new Colour("tomato", "#ef4026"),
  /* @__PURE__ */ new Colour("sea", "#3c9992"),
  /* @__PURE__ */ new Colour("muddy brown", "#886806"),
  /* @__PURE__ */ new Colour("turquoise green", "#04f489"),
  /* @__PURE__ */ new Colour("buff", "#fef69e"),
  /* @__PURE__ */ new Colour("fawn", "#cfaf7b"),
  /* @__PURE__ */ new Colour("muted blue", "#3b719f"),
  /* @__PURE__ */ new Colour("pale rose", "#fdc1c5"),
  /* @__PURE__ */ new Colour("dark mint green", "#20c073"),
  /* @__PURE__ */ new Colour("amethyst", "#9b5fc0"),
  /* @__PURE__ */ new Colour("blue/green", "#0f9b8e"),
  /* @__PURE__ */ new Colour("chestnut", "#742802"),
  /* @__PURE__ */ new Colour("sick green", "#9db92c"),
  /* @__PURE__ */ new Colour("pea", "#a4bf20"),
  /* @__PURE__ */ new Colour("rusty orange", "#cd5909"),
  /* @__PURE__ */ new Colour("stone", "#ada587"),
  /* @__PURE__ */ new Colour("rose red", "#be013c"),
  /* @__PURE__ */ new Colour("pale aqua", "#b8ffeb"),
  /* @__PURE__ */ new Colour("deep orange", "#dc4d01"),
  /* @__PURE__ */ new Colour("earth", "#a2653e"),
  /* @__PURE__ */ new Colour("mossy green", "#638b27"),
  /* @__PURE__ */ new Colour("grassy green", "#419c03"),
  /* @__PURE__ */ new Colour("pale lime green", "#b1ff65"),
  /* @__PURE__ */ new Colour("light grey blue", "#9dbcd4"),
  /* @__PURE__ */ new Colour("pale grey", "#fdfdfe"),
  /* @__PURE__ */ new Colour("asparagus", "#77ab56"),
  /* @__PURE__ */ new Colour("blueberry", "#464196"),
  /* @__PURE__ */ new Colour("purple red", "#990147"),
  /* @__PURE__ */ new Colour("pale lime", "#befd73"),
  /* @__PURE__ */ new Colour("greenish teal", "#32bf84"),
  /* @__PURE__ */ new Colour("caramel", "#af6f09"),
  /* @__PURE__ */ new Colour("deep magenta", "#a0025c"),
  /* @__PURE__ */ new Colour("light peach", "#ffd8b1"),
  /* @__PURE__ */ new Colour("milk chocolate", "#7f4e1e"),
  /* @__PURE__ */ new Colour("ocher", "#bf9b0c"),
  /* @__PURE__ */ new Colour("off green", "#6ba353"),
  /* @__PURE__ */ new Colour("purply pink", "#f075e6"),
  /* @__PURE__ */ new Colour("lightblue", "#7bc8f6"),
  /* @__PURE__ */ new Colour("dusky blue", "#475f94"),
  /* @__PURE__ */ new Colour("golden", "#f5bf03"),
  /* @__PURE__ */ new Colour("light beige", "#fffeb6"),
  /* @__PURE__ */ new Colour("butter yellow", "#fffd74"),
  /* @__PURE__ */ new Colour("dusky purple", "#895b7b"),
  /* @__PURE__ */ new Colour("french blue", "#436bad"),
  /* @__PURE__ */ new Colour("ugly yellow", "#d0c101"),
  /* @__PURE__ */ new Colour("greeny yellow", "#c6f808"),
  /* @__PURE__ */ new Colour("orangish red", "#f43605"),
  /* @__PURE__ */ new Colour("shamrock green", "#02c14d"),
  /* @__PURE__ */ new Colour("orangish brown", "#b25f03"),
  /* @__PURE__ */ new Colour("tree green", "#2a7e19"),
  /* @__PURE__ */ new Colour("deep violet", "#490648"),
  /* @__PURE__ */ new Colour("gunmetal", "#536267"),
  /* @__PURE__ */ new Colour("blue/purple", "#5a06ef"),
  /* @__PURE__ */ new Colour("cherry", "#cf0234"),
  /* @__PURE__ */ new Colour("sandy brown", "#c4a661"),
  /* @__PURE__ */ new Colour("warm grey", "#978a84"),
  /* @__PURE__ */ new Colour("dark indigo", "#1f0954"),
  /* @__PURE__ */ new Colour("midnight", "#03012d"),
  /* @__PURE__ */ new Colour("bluey green", "#2bb179"),
  /* @__PURE__ */ new Colour("grey pink", "#c3909b"),
  /* @__PURE__ */ new Colour("soft purple", "#a66fb5"),
  /* @__PURE__ */ new Colour("blood", "#770001"),
  /* @__PURE__ */ new Colour("brown red", "#922b05"),
  /* @__PURE__ */ new Colour("medium grey", "#7d7f7c"),
  /* @__PURE__ */ new Colour("berry", "#990f4b"),
  /* @__PURE__ */ new Colour("poo", "#8f7303"),
  /* @__PURE__ */ new Colour("purpley pink", "#c83cb9"),
  /* @__PURE__ */ new Colour("light salmon", "#fea993"),
  /* @__PURE__ */ new Colour("snot", "#acbb0d"),
  /* @__PURE__ */ new Colour("easter purple", "#c071fe"),
  /* @__PURE__ */ new Colour("light yellow green", "#ccfd7f"),
  /* @__PURE__ */ new Colour("dark navy blue", "#00022e"),
  /* @__PURE__ */ new Colour("drab", "#828344"),
  /* @__PURE__ */ new Colour("light rose", "#ffc5cb"),
  /* @__PURE__ */ new Colour("rouge", "#ab1239"),
  /* @__PURE__ */ new Colour("purplish red", "#b0054b"),
  /* @__PURE__ */ new Colour("slime green", "#99cc04"),
  /* @__PURE__ */ new Colour("baby poop", "#937c00"),
  /* @__PURE__ */ new Colour("irish green", "#019529"),
  /* @__PURE__ */ new Colour("pink/purple", "#ef1de7"),
  /* @__PURE__ */ new Colour("dark navy", "#000435"),
  /* @__PURE__ */ new Colour("greeny blue", "#42b395"),
  /* @__PURE__ */ new Colour("light plum", "#9d5783"),
  /* @__PURE__ */ new Colour("pinkish grey", "#c8aca9"),
  /* @__PURE__ */ new Colour("dirty orange", "#c87606"),
  /* @__PURE__ */ new Colour("rust red", "#aa2704"),
  /* @__PURE__ */ new Colour("pale lilac", "#e4cbff"),
  /* @__PURE__ */ new Colour("orangey red", "#fa4224"),
  /* @__PURE__ */ new Colour("primary blue", "#0804f9"),
  /* @__PURE__ */ new Colour("kermit green", "#5cb200"),
  /* @__PURE__ */ new Colour("brownish purple", "#76424e"),
  /* @__PURE__ */ new Colour("murky green", "#6c7a0e"),
  /* @__PURE__ */ new Colour("wheat", "#fbdd7e"),
  /* @__PURE__ */ new Colour("very dark purple", "#2a0134"),
  /* @__PURE__ */ new Colour("bottle green", "#044a05"),
  /* @__PURE__ */ new Colour("watermelon", "#fd4659"),
  /* @__PURE__ */ new Colour("deep sky blue", "#0d75f8"),
  /* @__PURE__ */ new Colour("fire engine red", "#fe0002"),
  /* @__PURE__ */ new Colour("yellow ochre", "#cb9d06"),
  /* @__PURE__ */ new Colour("pumpkin orange", "#fb7d07"),
  /* @__PURE__ */ new Colour("pale olive", "#b9cc81"),
  /* @__PURE__ */ new Colour("light lilac", "#edc8ff"),
  /* @__PURE__ */ new Colour("lightish green", "#61e160"),
  /* @__PURE__ */ new Colour("carolina blue", "#8ab8fe"),
  /* @__PURE__ */ new Colour("mulberry", "#920a4e"),
  /* @__PURE__ */ new Colour("shocking pink", "#fe02a2"),
  /* @__PURE__ */ new Colour("auburn", "#9a3001"),
  /* @__PURE__ */ new Colour("bright lime green", "#65fe08"),
  /* @__PURE__ */ new Colour("celadon", "#befdb7"),
  /* @__PURE__ */ new Colour("pinkish brown", "#b17261"),
  /* @__PURE__ */ new Colour("poo brown", "#885f01"),
  /* @__PURE__ */ new Colour("bright sky blue", "#02ccfe"),
  /* @__PURE__ */ new Colour("celery", "#c1fd95"),
  /* @__PURE__ */ new Colour("dirt brown", "#836539"),
  /* @__PURE__ */ new Colour("strawberry", "#fb2943"),
  /* @__PURE__ */ new Colour("dark lime", "#84b701"),
  /* @__PURE__ */ new Colour("copper", "#b66325"),
  /* @__PURE__ */ new Colour("medium brown", "#7f5112"),
  /* @__PURE__ */ new Colour("muted green", "#5fa052"),
  /* @__PURE__ */ new Colour("robin's egg", "#6dedfd"),
  /* @__PURE__ */ new Colour("bright aqua", "#0bf9ea"),
  /* @__PURE__ */ new Colour("bright lavender", "#c760ff"),
  /* @__PURE__ */ new Colour("ivory", "#ffffcb"),
  /* @__PURE__ */ new Colour("very light purple", "#f6cefc"),
  /* @__PURE__ */ new Colour("light navy", "#155084"),
  /* @__PURE__ */ new Colour("pink red", "#f5054f"),
  /* @__PURE__ */ new Colour("olive brown", "#645403"),
  /* @__PURE__ */ new Colour("poop brown", "#7a5901"),
  /* @__PURE__ */ new Colour("mustard green", "#a8b504"),
  /* @__PURE__ */ new Colour("ocean green", "#3d9973"),
  /* @__PURE__ */ new Colour("very dark blue", "#000133"),
  /* @__PURE__ */ new Colour("dusty green", "#76a973"),
  /* @__PURE__ */ new Colour("light navy blue", "#2e5a88"),
  /* @__PURE__ */ new Colour("minty green", "#0bf77d"),
  /* @__PURE__ */ new Colour("adobe", "#bd6c48"),
  /* @__PURE__ */ new Colour("barney", "#ac1db8"),
  /* @__PURE__ */ new Colour("jade green", "#2baf6a"),
  /* @__PURE__ */ new Colour("bright light blue", "#26f7fd"),
  /* @__PURE__ */ new Colour("light lime", "#aefd6c"),
  /* @__PURE__ */ new Colour("dark khaki", "#9b8f55"),
  /* @__PURE__ */ new Colour("orange yellow", "#ffad01"),
  /* @__PURE__ */ new Colour("ocre", "#c69c04"),
  /* @__PURE__ */ new Colour("maize", "#f4d054"),
  /* @__PURE__ */ new Colour("faded pink", "#de9dac"),
  /* @__PURE__ */ new Colour("british racing green", "#05480d"),
  /* @__PURE__ */ new Colour("sandstone", "#c9ae74"),
  /* @__PURE__ */ new Colour("mud brown", "#60460f"),
  /* @__PURE__ */ new Colour("light sea green", "#98f6b0"),
  /* @__PURE__ */ new Colour("robin egg blue", "#8af1fe"),
  /* @__PURE__ */ new Colour("aqua marine", "#2ee8bb"),
  /* @__PURE__ */ new Colour("dark sea green", "#11875d"),
  /* @__PURE__ */ new Colour("soft pink", "#fdb0c0"),
  /* @__PURE__ */ new Colour("orangey brown", "#b16002"),
  /* @__PURE__ */ new Colour("cherry red", "#f7022a"),
  /* @__PURE__ */ new Colour("burnt yellow", "#d5ab09"),
  /* @__PURE__ */ new Colour("brownish grey", "#86775f"),
  /* @__PURE__ */ new Colour("camel", "#c69f59"),
  /* @__PURE__ */ new Colour("purplish grey", "#7a687f"),
  /* @__PURE__ */ new Colour("marine", "#042e60"),
  /* @__PURE__ */ new Colour("greyish pink", "#c88d94"),
  /* @__PURE__ */ new Colour("pale turquoise", "#a5fbd5"),
  /* @__PURE__ */ new Colour("pastel yellow", "#fffe71"),
  /* @__PURE__ */ new Colour("bluey purple", "#6241c7"),
  /* @__PURE__ */ new Colour("canary yellow", "#fffe40"),
  /* @__PURE__ */ new Colour("faded red", "#d3494e"),
  /* @__PURE__ */ new Colour("sepia", "#985e2b"),
  /* @__PURE__ */ new Colour("coffee", "#a6814c"),
  /* @__PURE__ */ new Colour("bright magenta", "#ff08e8"),
  /* @__PURE__ */ new Colour("mocha", "#9d7651"),
  /* @__PURE__ */ new Colour("ecru", "#feffca"),
  /* @__PURE__ */ new Colour("purpleish", "#98568d"),
  /* @__PURE__ */ new Colour("cranberry", "#9e003a"),
  /* @__PURE__ */ new Colour("darkish green", "#287c37"),
  /* @__PURE__ */ new Colour("brown orange", "#b96902"),
  /* @__PURE__ */ new Colour("dusky rose", "#ba6873"),
  /* @__PURE__ */ new Colour("melon", "#ff7855"),
  /* @__PURE__ */ new Colour("sickly green", "#94b21c"),
  /* @__PURE__ */ new Colour("silver", "#c5c9c7"),
  /* @__PURE__ */ new Colour("purply blue", "#661aee"),
  /* @__PURE__ */ new Colour("purpleish blue", "#6140ef"),
  /* @__PURE__ */ new Colour("hospital green", "#9be5aa"),
  /* @__PURE__ */ new Colour("shit brown", "#7b5804"),
  /* @__PURE__ */ new Colour("mid blue", "#276ab3"),
  /* @__PURE__ */ new Colour("amber", "#feb308"),
  /* @__PURE__ */ new Colour("easter green", "#8cfd7e"),
  /* @__PURE__ */ new Colour("soft blue", "#6488ea"),
  /* @__PURE__ */ new Colour("cerulean blue", "#056eee"),
  /* @__PURE__ */ new Colour("golden brown", "#b27a01"),
  /* @__PURE__ */ new Colour("bright turquoise", "#0ffef9"),
  /* @__PURE__ */ new Colour("red pink", "#fa2a55"),
  /* @__PURE__ */ new Colour("red purple", "#820747"),
  /* @__PURE__ */ new Colour("greyish brown", "#7a6a4f"),
  /* @__PURE__ */ new Colour("vermillion", "#f4320c"),
  /* @__PURE__ */ new Colour("russet", "#a13905"),
  /* @__PURE__ */ new Colour("steel grey", "#6f828a"),
  /* @__PURE__ */ new Colour("lighter purple", "#a55af4"),
  /* @__PURE__ */ new Colour("bright violet", "#ad0afd"),
  /* @__PURE__ */ new Colour("prussian blue", "#004577"),
  /* @__PURE__ */ new Colour("slate green", "#658d6d"),
  /* @__PURE__ */ new Colour("dirty pink", "#ca7b80"),
  /* @__PURE__ */ new Colour("dark blue green", "#005249"),
  /* @__PURE__ */ new Colour("pine", "#2b5d34"),
  /* @__PURE__ */ new Colour("yellowy green", "#bff128"),
  /* @__PURE__ */ new Colour("dark gold", "#b59410"),
  /* @__PURE__ */ new Colour("bluish", "#2976bb"),
  /* @__PURE__ */ new Colour("darkish blue", "#014182"),
  /* @__PURE__ */ new Colour("dull red", "#bb3f3f"),
  /* @__PURE__ */ new Colour("pinky red", "#fc2647"),
  /* @__PURE__ */ new Colour("bronze", "#a87900"),
  /* @__PURE__ */ new Colour("pale teal", "#82cbb2"),
  /* @__PURE__ */ new Colour("military green", "#667c3e"),
  /* @__PURE__ */ new Colour("barbie pink", "#fe46a5"),
  /* @__PURE__ */ new Colour("bubblegum pink", "#fe83cc"),
  /* @__PURE__ */ new Colour("pea soup green", "#94a617"),
  /* @__PURE__ */ new Colour("dark mustard", "#a88905"),
  /* @__PURE__ */ new Colour("shit", "#7f5f00"),
  /* @__PURE__ */ new Colour("medium purple", "#9e43a2"),
  /* @__PURE__ */ new Colour("very dark green", "#062e03"),
  /* @__PURE__ */ new Colour("dirt", "#8a6e45"),
  /* @__PURE__ */ new Colour("dusky pink", "#cc7a8b"),
  /* @__PURE__ */ new Colour("red violet", "#9e0168"),
  /* @__PURE__ */ new Colour("lemon yellow", "#fdff38"),
  /* @__PURE__ */ new Colour("pistachio", "#c0fa8b"),
  /* @__PURE__ */ new Colour("dull yellow", "#eedc5b"),
  /* @__PURE__ */ new Colour("dark lime green", "#7ebd01"),
  /* @__PURE__ */ new Colour("denim blue", "#3b5b92"),
  /* @__PURE__ */ new Colour("teal blue", "#01889f"),
  /* @__PURE__ */ new Colour("lightish blue", "#3d7afd"),
  /* @__PURE__ */ new Colour("purpley blue", "#5f34e7"),
  /* @__PURE__ */ new Colour("light indigo", "#6d5acf"),
  /* @__PURE__ */ new Colour("swamp green", "#748500"),
  /* @__PURE__ */ new Colour("brown green", "#706c11"),
  /* @__PURE__ */ new Colour("dark maroon", "#3c0008"),
  /* @__PURE__ */ new Colour("hot purple", "#cb00f5"),
  /* @__PURE__ */ new Colour("dark forest green", "#002d04"),
  /* @__PURE__ */ new Colour("faded blue", "#658cbb"),
  /* @__PURE__ */ new Colour("drab green", "#749551"),
  /* @__PURE__ */ new Colour("light lime green", "#b9ff66"),
  /* @__PURE__ */ new Colour("snot green", "#9dc100"),
  /* @__PURE__ */ new Colour("yellowish", "#faee66"),
  /* @__PURE__ */ new Colour("light blue green", "#7efbb3"),
  /* @__PURE__ */ new Colour("bordeaux", "#7b002c"),
  /* @__PURE__ */ new Colour("light mauve", "#c292a1"),
  /* @__PURE__ */ new Colour("ocean", "#017b92"),
  /* @__PURE__ */ new Colour("marigold", "#fcc006"),
  /* @__PURE__ */ new Colour("muddy green", "#657432"),
  /* @__PURE__ */ new Colour("dull orange", "#d8863b"),
  /* @__PURE__ */ new Colour("steel", "#738595"),
  /* @__PURE__ */ new Colour("electric purple", "#aa23ff"),
  /* @__PURE__ */ new Colour("fluorescent green", "#08ff08"),
  /* @__PURE__ */ new Colour("yellowish brown", "#9b7a01"),
  /* @__PURE__ */ new Colour("blush", "#f29e8e"),
  /* @__PURE__ */ new Colour("soft green", "#6fc276"),
  /* @__PURE__ */ new Colour("bright orange", "#ff5b00"),
  /* @__PURE__ */ new Colour("lemon", "#fdff52"),
  /* @__PURE__ */ new Colour("purple grey", "#866f85"),
  /* @__PURE__ */ new Colour("acid green", "#8ffe09"),
  /* @__PURE__ */ new Colour("pale lavender", "#eecffe"),
  /* @__PURE__ */ new Colour("violet blue", "#510ac9"),
  /* @__PURE__ */ new Colour("light forest green", "#4f9153"),
  /* @__PURE__ */ new Colour("burnt red", "#9f2305"),
  /* @__PURE__ */ new Colour("khaki green", "#728639"),
  /* @__PURE__ */ new Colour("cerise", "#de0c62"),
  /* @__PURE__ */ new Colour("faded purple", "#916e99"),
  /* @__PURE__ */ new Colour("apricot", "#ffb16d"),
  /* @__PURE__ */ new Colour("dark olive green", "#3c4d03"),
  /* @__PURE__ */ new Colour("grey brown", "#7f7053"),
  /* @__PURE__ */ new Colour("green grey", "#77926f"),
  /* @__PURE__ */ new Colour("true blue", "#010fcc"),
  /* @__PURE__ */ new Colour("pale violet", "#ceaefa"),
  /* @__PURE__ */ new Colour("periwinkle blue", "#8f99fb"),
  /* @__PURE__ */ new Colour("light sky blue", "#c6fcff"),
  /* @__PURE__ */ new Colour("blurple", "#5539cc"),
  /* @__PURE__ */ new Colour("green brown", "#544e03"),
  /* @__PURE__ */ new Colour("bluegreen", "#017a79"),
  /* @__PURE__ */ new Colour("bright teal", "#01f9c6"),
  /* @__PURE__ */ new Colour("brownish yellow", "#c9b003"),
  /* @__PURE__ */ new Colour("pea soup", "#929901"),
  /* @__PURE__ */ new Colour("forest", "#0b5509"),
  /* @__PURE__ */ new Colour("barney purple", "#a00498"),
  /* @__PURE__ */ new Colour("ultramarine", "#2000b1"),
  /* @__PURE__ */ new Colour("purplish", "#94568c"),
  /* @__PURE__ */ new Colour("puke yellow", "#c2be0e"),
  /* @__PURE__ */ new Colour("bluish grey", "#748b97"),
  /* @__PURE__ */ new Colour("dark periwinkle", "#665fd1"),
  /* @__PURE__ */ new Colour("dark lilac", "#9c6da5"),
  /* @__PURE__ */ new Colour("reddish", "#c44240"),
  /* @__PURE__ */ new Colour("light maroon", "#a24857"),
  /* @__PURE__ */ new Colour("dusty purple", "#825f87"),
  /* @__PURE__ */ new Colour("terra cotta", "#c9643b"),
  /* @__PURE__ */ new Colour("avocado", "#90b134"),
  /* @__PURE__ */ new Colour("marine blue", "#01386a"),
  /* @__PURE__ */ new Colour("teal green", "#25a36f"),
  /* @__PURE__ */ new Colour("slate grey", "#59656d"),
  /* @__PURE__ */ new Colour("lighter green", "#75fd63"),
  /* @__PURE__ */ new Colour("electric green", "#21fc0d"),
  /* @__PURE__ */ new Colour("dusty blue", "#5a86ad"),
  /* @__PURE__ */ new Colour("golden yellow", "#fec615"),
  /* @__PURE__ */ new Colour("bright yellow", "#fffd01"),
  /* @__PURE__ */ new Colour("light lavender", "#dfc5fe"),
  /* @__PURE__ */ new Colour("umber", "#b26400"),
  /* @__PURE__ */ new Colour("poop", "#7f5e00"),
  /* @__PURE__ */ new Colour("dark peach", "#de7e5d"),
  /* @__PURE__ */ new Colour("jungle green", "#048243"),
  /* @__PURE__ */ new Colour("eggshell", "#ffffd4"),
  /* @__PURE__ */ new Colour("denim", "#3b638c"),
  /* @__PURE__ */ new Colour("yellow brown", "#b79400"),
  /* @__PURE__ */ new Colour("dull purple", "#84597e"),
  /* @__PURE__ */ new Colour("chocolate brown", "#411900"),
  /* @__PURE__ */ new Colour("wine red", "#7b0323"),
  /* @__PURE__ */ new Colour("neon blue", "#04d9ff"),
  /* @__PURE__ */ new Colour("dirty green", "#667e2c"),
  /* @__PURE__ */ new Colour("light tan", "#fbeeac"),
  /* @__PURE__ */ new Colour("ice blue", "#d7fffe"),
  /* @__PURE__ */ new Colour("cadet blue", "#4e7496"),
  /* @__PURE__ */ new Colour("dark mauve", "#874c62"),
  /* @__PURE__ */ new Colour("very light blue", "#d5ffff"),
  /* @__PURE__ */ new Colour("grey purple", "#826d8c"),
  /* @__PURE__ */ new Colour("pastel pink", "#ffbacd"),
  /* @__PURE__ */ new Colour("very light green", "#d1ffbd"),
  /* @__PURE__ */ new Colour("dark sky blue", "#448ee4"),
  /* @__PURE__ */ new Colour("evergreen", "#05472a"),
  /* @__PURE__ */ new Colour("dull pink", "#d5869d"),
  /* @__PURE__ */ new Colour("aubergine", "#3d0734"),
  /* @__PURE__ */ new Colour("mahogany", "#4a0100"),
  /* @__PURE__ */ new Colour("reddish orange", "#f8481c"),
  /* @__PURE__ */ new Colour("deep green", "#02590f"),
  /* @__PURE__ */ new Colour("vomit green", "#89a203"),
  /* @__PURE__ */ new Colour("purple pink", "#e03fd8"),
  /* @__PURE__ */ new Colour("dusty pink", "#d58a94"),
  /* @__PURE__ */ new Colour("faded green", "#7bb274"),
  /* @__PURE__ */ new Colour("camo green", "#526525"),
  /* @__PURE__ */ new Colour("pinky purple", "#c94cbe"),
  /* @__PURE__ */ new Colour("pink purple", "#db4bda"),
  /* @__PURE__ */ new Colour("brownish red", "#9e3623"),
  /* @__PURE__ */ new Colour("dark rose", "#b5485d"),
  /* @__PURE__ */ new Colour("mud", "#735c12"),
  /* @__PURE__ */ new Colour("brownish", "#9c6d57"),
  /* @__PURE__ */ new Colour("emerald green", "#028f1e"),
  /* @__PURE__ */ new Colour("pale brown", "#b1916e"),
  /* @__PURE__ */ new Colour("dull blue", "#49759c"),
  /* @__PURE__ */ new Colour("burnt umber", "#a0450e"),
  /* @__PURE__ */ new Colour("medium green", "#39ad48"),
  /* @__PURE__ */ new Colour("clay", "#b66a50"),
  /* @__PURE__ */ new Colour("light aqua", "#8cffdb"),
  /* @__PURE__ */ new Colour("light olive green", "#a4be5c"),
  /* @__PURE__ */ new Colour("brownish orange", "#cb7723"),
  /* @__PURE__ */ new Colour("dark aqua", "#05696b"),
  /* @__PURE__ */ new Colour("purplish pink", "#ce5dae"),
  /* @__PURE__ */ new Colour("dark salmon", "#c85a53"),
  /* @__PURE__ */ new Colour("greenish grey", "#96ae8d"),
  /* @__PURE__ */ new Colour("jade", "#1fa774"),
  /* @__PURE__ */ new Colour("ugly green", "#7a9703"),
  /* @__PURE__ */ new Colour("dark beige", "#ac9362"),
  /* @__PURE__ */ new Colour("emerald", "#01a049"),
  /* @__PURE__ */ new Colour("pale red", "#d9544d"),
  /* @__PURE__ */ new Colour("light magenta", "#fa5ff7"),
  /* @__PURE__ */ new Colour("sky", "#82cafc"),
  /* @__PURE__ */ new Colour("light cyan", "#acfffc"),
  /* @__PURE__ */ new Colour("yellow orange", "#fcb001"),
  /* @__PURE__ */ new Colour("reddish purple", "#910951"),
  /* @__PURE__ */ new Colour("reddish pink", "#fe2c54"),
  /* @__PURE__ */ new Colour("orchid", "#c875c4"),
  /* @__PURE__ */ new Colour("dirty yellow", "#cdc50a"),
  /* @__PURE__ */ new Colour("orange red", "#fd411e"),
  /* @__PURE__ */ new Colour("deep red", "#9a0200"),
  /* @__PURE__ */ new Colour("orange brown", "#be6400"),
  /* @__PURE__ */ new Colour("cobalt blue", "#030aa7"),
  /* @__PURE__ */ new Colour("neon pink", "#fe019a"),
  /* @__PURE__ */ new Colour("rose pink", "#f7879a"),
  /* @__PURE__ */ new Colour("greyish purple", "#887191"),
  /* @__PURE__ */ new Colour("raspberry", "#b00149"),
  /* @__PURE__ */ new Colour("aqua green", "#12e193"),
  /* @__PURE__ */ new Colour("salmon pink", "#fe7b7c"),
  /* @__PURE__ */ new Colour("tangerine", "#ff9408"),
  /* @__PURE__ */ new Colour("brownish green", "#6a6e09"),
  /* @__PURE__ */ new Colour("red brown", "#8b2e16"),
  /* @__PURE__ */ new Colour("greenish brown", "#696112"),
  /* @__PURE__ */ new Colour("pumpkin", "#e17701"),
  /* @__PURE__ */ new Colour("pine green", "#0a481e"),
  /* @__PURE__ */ new Colour("charcoal", "#343837"),
  /* @__PURE__ */ new Colour("baby pink", "#ffb7ce"),
  /* @__PURE__ */ new Colour("cornflower", "#6a79f7"),
  /* @__PURE__ */ new Colour("blue violet", "#5d06e9"),
  /* @__PURE__ */ new Colour("chocolate", "#3d1c02"),
  /* @__PURE__ */ new Colour("greyish green", "#82a67d"),
  /* @__PURE__ */ new Colour("scarlet", "#be0119"),
  /* @__PURE__ */ new Colour("green yellow", "#c9ff27"),
  /* @__PURE__ */ new Colour("dark olive", "#373e02"),
  /* @__PURE__ */ new Colour("sienna", "#a9561e"),
  /* @__PURE__ */ new Colour("pastel purple", "#caa0ff"),
  /* @__PURE__ */ new Colour("terracotta", "#ca6641"),
  /* @__PURE__ */ new Colour("aqua blue", "#02d8e9"),
  /* @__PURE__ */ new Colour("sage green", "#88b378"),
  /* @__PURE__ */ new Colour("blood red", "#980002"),
  /* @__PURE__ */ new Colour("deep pink", "#cb0162"),
  /* @__PURE__ */ new Colour("grass", "#5cac2d"),
  /* @__PURE__ */ new Colour("moss", "#769958"),
  /* @__PURE__ */ new Colour("pastel blue", "#a2bffe"),
  /* @__PURE__ */ new Colour("bluish green", "#10a674"),
  /* @__PURE__ */ new Colour("green blue", "#06b48b"),
  /* @__PURE__ */ new Colour("dark tan", "#af884a"),
  /* @__PURE__ */ new Colour("greenish blue", "#0b8b87"),
  /* @__PURE__ */ new Colour("pale orange", "#ffa756"),
  /* @__PURE__ */ new Colour("vomit", "#a2a415"),
  /* @__PURE__ */ new Colour("forrest green", "#154406"),
  /* @__PURE__ */ new Colour("dark lavender", "#856798"),
  /* @__PURE__ */ new Colour("dark violet", "#34013f"),
  /* @__PURE__ */ new Colour("purple blue", "#632de9"),
  /* @__PURE__ */ new Colour("dark cyan", "#0a888a"),
  /* @__PURE__ */ new Colour("olive drab", "#6f7632"),
  /* @__PURE__ */ new Colour("pinkish", "#d46a7e"),
  /* @__PURE__ */ new Colour("cobalt", "#1e488f"),
  /* @__PURE__ */ new Colour("neon purple", "#bc13fe"),
  /* @__PURE__ */ new Colour("light turquoise", "#7ef4cc"),
  /* @__PURE__ */ new Colour("apple green", "#76cd26"),
  /* @__PURE__ */ new Colour("dull green", "#74a662"),
  /* @__PURE__ */ new Colour("wine", "#80013f"),
  /* @__PURE__ */ new Colour("powder blue", "#b1d1fc"),
  /* @__PURE__ */ new Colour("off white", "#ffffe4"),
  /* @__PURE__ */ new Colour("electric blue", "#0652ff"),
  /* @__PURE__ */ new Colour("dark turquoise", "#045c5a"),
  /* @__PURE__ */ new Colour("blue purple", "#5729ce"),
  /* @__PURE__ */ new Colour("azure", "#069af3"),
  /* @__PURE__ */ new Colour("bright red", "#ff000d"),
  /* @__PURE__ */ new Colour("pinkish red", "#f10c45"),
  /* @__PURE__ */ new Colour("cornflower blue", "#5170d7"),
  /* @__PURE__ */ new Colour("light olive", "#acbf69"),
  /* @__PURE__ */ new Colour("grape", "#6c3461"),
  /* @__PURE__ */ new Colour("greyish blue", "#5e819d"),
  /* @__PURE__ */ new Colour("purplish blue", "#601ef9"),
  /* @__PURE__ */ new Colour("yellowish green", "#b0dd16"),
  /* @__PURE__ */ new Colour("greenish yellow", "#cdfd02"),
  /* @__PURE__ */ new Colour("medium blue", "#2c6fbb"),
  /* @__PURE__ */ new Colour("dusty rose", "#c0737a"),
  /* @__PURE__ */ new Colour("light violet", "#d6b4fc"),
  /* @__PURE__ */ new Colour("midnight blue", "#020035"),
  /* @__PURE__ */ new Colour("bluish purple", "#703be7"),
  /* @__PURE__ */ new Colour("red orange", "#fd3c06"),
  /* @__PURE__ */ new Colour("dark magenta", "#960056"),
  /* @__PURE__ */ new Colour("greenish", "#40a368"),
  /* @__PURE__ */ new Colour("ocean blue", "#03719c"),
  /* @__PURE__ */ new Colour("coral", "#fc5a50"),
  /* @__PURE__ */ new Colour("cream", "#ffffc2"),
  /* @__PURE__ */ new Colour("reddish brown", "#7f2b0a"),
  /* @__PURE__ */ new Colour("burnt sienna", "#b04e0f"),
  /* @__PURE__ */ new Colour("brick", "#a03623"),
  /* @__PURE__ */ new Colour("sage", "#87ae73"),
  /* @__PURE__ */ new Colour("grey green", "#789b73"),
  /* @__PURE__ */ new Colour("white", "#ffffff"),
  /* @__PURE__ */ new Colour("robin's egg blue", "#98eff9"),
  /* @__PURE__ */ new Colour("moss green", "#658b38"),
  /* @__PURE__ */ new Colour("steel blue", "#5a7d9a"),
  /* @__PURE__ */ new Colour("eggplant", "#380835"),
  /* @__PURE__ */ new Colour("light yellow", "#fffe7a"),
  /* @__PURE__ */ new Colour("leaf green", "#5ca904"),
  /* @__PURE__ */ new Colour("light grey", "#d8dcd6"),
  /* @__PURE__ */ new Colour("puke", "#a5a502"),
  /* @__PURE__ */ new Colour("pinkish purple", "#d648d7"),
  /* @__PURE__ */ new Colour("sea blue", "#047495"),
  /* @__PURE__ */ new Colour("pale purple", "#b790d4"),
  /* @__PURE__ */ new Colour("slate blue", "#5b7c99"),
  /* @__PURE__ */ new Colour("blue grey", "#607c8e"),
  /* @__PURE__ */ new Colour("hunter green", "#0b4008"),
  /* @__PURE__ */ new Colour("fuchsia", "#ed0dd9"),
  /* @__PURE__ */ new Colour("crimson", "#8c000f"),
  /* @__PURE__ */ new Colour("pale yellow", "#ffff84"),
  /* @__PURE__ */ new Colour("ochre", "#bf9005"),
  /* @__PURE__ */ new Colour("mustard yellow", "#d2bd0a"),
  /* @__PURE__ */ new Colour("light red", "#ff474c"),
  /* @__PURE__ */ new Colour("cerulean", "#0485d1"),
  /* @__PURE__ */ new Colour("pale pink", "#ffcfdc"),
  /* @__PURE__ */ new Colour("deep blue", "#040273"),
  /* @__PURE__ */ new Colour("rust", "#a83c09"),
  /* @__PURE__ */ new Colour("light teal", "#90e4c1"),
  /* @__PURE__ */ new Colour("slate", "#516572"),
  /* @__PURE__ */ new Colour("goldenrod", "#fac205"),
  /* @__PURE__ */ new Colour("dark yellow", "#d5b60a"),
  /* @__PURE__ */ new Colour("dark grey", "#363737"),
  /* @__PURE__ */ new Colour("army green", "#4b5d16"),
  /* @__PURE__ */ new Colour("grey blue", "#6b8ba4"),
  /* @__PURE__ */ new Colour("seafoam", "#80f9ad"),
  /* @__PURE__ */ new Colour("puce", "#a57e52"),
  /* @__PURE__ */ new Colour("spring green", "#a9f971"),
  /* @__PURE__ */ new Colour("dark orange", "#c65102"),
  /* @__PURE__ */ new Colour("sand", "#e2ca76"),
  /* @__PURE__ */ new Colour("pastel green", "#b0ff9d"),
  /* @__PURE__ */ new Colour("mint", "#9ffeb0"),
  /* @__PURE__ */ new Colour("light orange", "#fdaa48"),
  /* @__PURE__ */ new Colour("bright pink", "#fe01b1"),
  /* @__PURE__ */ new Colour("chartreuse", "#c1f80a"),
  /* @__PURE__ */ new Colour("deep purple", "#36013f"),
  /* @__PURE__ */ new Colour("dark brown", "#341c02"),
  /* @__PURE__ */ new Colour("taupe", "#b9a281"),
  /* @__PURE__ */ new Colour("pea green", "#8eab12"),
  /* @__PURE__ */ new Colour("puke green", "#9aae07"),
  /* @__PURE__ */ new Colour("kelly green", "#02ab2e"),
  /* @__PURE__ */ new Colour("seafoam green", "#7af9ab"),
  /* @__PURE__ */ new Colour("blue green", "#137e6d"),
  /* @__PURE__ */ new Colour("khaki", "#aaa662"),
  /* @__PURE__ */ new Colour("burgundy", "#610023"),
  /* @__PURE__ */ new Colour("dark teal", "#014d4e"),
  /* @__PURE__ */ new Colour("brick red", "#8f1402"),
  /* @__PURE__ */ new Colour("royal purple", "#4b006e"),
  /* @__PURE__ */ new Colour("plum", "#580f41"),
  /* @__PURE__ */ new Colour("mint green", "#8fff9f"),
  /* @__PURE__ */ new Colour("gold", "#dbb40c"),
  /* @__PURE__ */ new Colour("baby blue", "#a2cffe"),
  /* @__PURE__ */ new Colour("yellow green", "#c0fb2d"),
  /* @__PURE__ */ new Colour("bright purple", "#be03fd"),
  /* @__PURE__ */ new Colour("dark red", "#840000"),
  /* @__PURE__ */ new Colour("pale blue", "#d0fefe"),
  /* @__PURE__ */ new Colour("grass green", "#3f9b0b"),
  /* @__PURE__ */ new Colour("navy", "#01153e"),
  /* @__PURE__ */ new Colour("aquamarine", "#04d8b2"),
  /* @__PURE__ */ new Colour("burnt orange", "#c04e01"),
  /* @__PURE__ */ new Colour("neon green", "#0cff0c"),
  /* @__PURE__ */ new Colour("bright blue", "#0165fc"),
  /* @__PURE__ */ new Colour("rose", "#cf6275"),
  /* @__PURE__ */ new Colour("light pink", "#ffd1df"),
  /* @__PURE__ */ new Colour("mustard", "#ceb301"),
  /* @__PURE__ */ new Colour("indigo", "#380282"),
  /* @__PURE__ */ new Colour("lime", "#aaff32"),
  /* @__PURE__ */ new Colour("sea green", "#53fca1"),
  /* @__PURE__ */ new Colour("periwinkle", "#8e82fe"),
  /* @__PURE__ */ new Colour("dark pink", "#cb416b"),
  /* @__PURE__ */ new Colour("olive green", "#677a04"),
  /* @__PURE__ */ new Colour("peach", "#ffb07c"),
  /* @__PURE__ */ new Colour("pale green", "#c7fdb5"),
  /* @__PURE__ */ new Colour("light brown", "#ad8150"),
  /* @__PURE__ */ new Colour("hot pink", "#ff028d"),
  /* @__PURE__ */ new Colour("black", "#000000"),
  /* @__PURE__ */ new Colour("lilac", "#cea2fd"),
  /* @__PURE__ */ new Colour("navy blue", "#001146"),
  /* @__PURE__ */ new Colour("royal blue", "#0504aa"),
  /* @__PURE__ */ new Colour("beige", "#e6daa6"),
  /* @__PURE__ */ new Colour("salmon", "#ff796c"),
  /* @__PURE__ */ new Colour("olive", "#6e750e"),
  /* @__PURE__ */ new Colour("maroon", "#650021"),
  /* @__PURE__ */ new Colour("bright green", "#01ff07"),
  /* @__PURE__ */ new Colour("dark purple", "#35063e"),
  /* @__PURE__ */ new Colour("mauve", "#ae7181"),
  /* @__PURE__ */ new Colour("forest green", "#06470c"),
  /* @__PURE__ */ new Colour("aqua", "#13eac9"),
  /* @__PURE__ */ new Colour("cyan", "#00ffff"),
  /* @__PURE__ */ new Colour("tan", "#d1b26f"),
  /* @__PURE__ */ new Colour("dark blue", "#00035b"),
  /* @__PURE__ */ new Colour("lavender", "#c79fef"),
  /* @__PURE__ */ new Colour("turquoise", "#06c2ac"),
  /* @__PURE__ */ new Colour("dark green", "#033500"),
  /* @__PURE__ */ new Colour("violet", "#9a0eea"),
  /* @__PURE__ */ new Colour("light purple", "#bf77f6"),
  /* @__PURE__ */ new Colour("lime green", "#89fe05"),
  /* @__PURE__ */ new Colour("grey", "#929591"),
  /* @__PURE__ */ new Colour("sky blue", "#75bbfd"),
  /* @__PURE__ */ new Colour("yellow", "#ffff14"),
  /* @__PURE__ */ new Colour("magenta", "#c20078"),
  /* @__PURE__ */ new Colour("light green", "#96f97b"),
  /* @__PURE__ */ new Colour("orange", "#f97306"),
  /* @__PURE__ */ new Colour("teal", "#029386"),
  /* @__PURE__ */ new Colour("light blue", "#95d0fc"),
  /* @__PURE__ */ new Colour("red", "#e50000"),
  /* @__PURE__ */ new Colour("brown", "#653700"),
  /* @__PURE__ */ new Colour("pink", "#ff81c0"),
  /* @__PURE__ */ new Colour("blue", "#0343df"),
  /* @__PURE__ */ new Colour("green", "#15b01a"),
  /* @__PURE__ */ new Colour("purple", "#7e1e9c")
]);
function init(hash) {
  return [
    (() => {
      let _pipe = colours;
      let _pipe$1 = find2(_pipe, (x) => {
        return x.hex === hash;
      });
      return unwrap(_pipe$1, new Colour("Red", "#e50000"));
    })(),
    none()
  ];
}
function update2(model, msg) {
  if (msg instanceof Random) {
    let _block;
    let _pipe = colours;
    let _pipe$1 = shuffle(_pipe);
    let _pipe$2 = first(_pipe$1);
    _block = unwrap(_pipe$2, new Colour("Failure", "#f00"));
    let found = _block;
    return [found, update_hash_effect(found.hex)];
  } else if (msg instanceof UserSetColour) {
    let hex = msg.hex;
    return [
      (() => {
        let _pipe = colours;
        let _pipe$1 = find2(_pipe, (x) => {
          return x.hex === hex;
        });
        return unwrap(_pipe$1, new Colour("Failure", "#f00"));
      })(),
      update_hash_effect(hex)
    ];
  } else {
    return [model, none()];
  }
}
function view(model) {
  let name = model.name;
  let width = 400;
  let _block;
  let $ = string_length(name);
  let x = $;
  if (x >= 26) {
    _block = 12;
  } else {
    let x$1 = $;
    if (x$1 >= 22) {
      _block = 14;
    } else {
      let x$2 = $;
      if (x$2 >= 18) {
        _block = 22;
      } else {
        let x$3 = $;
        if (x$3 >= 10) {
          _block = 30;
        } else {
          _block = 40;
        }
      }
    }
  }
  let colour_font_size = _block;
  return div(
    toList([class$("mx-auto w-max py-8")]),
    toList([
      h1(
        toList([class$("text-3xl mb-4 text-center capitalize")]),
        toList([
          text2(
            "He's " + capitalise(model.name) + " For An Amazing Reason"
          )
        ])
      ),
      svg(
        toList([
          class$("rounded-md mx-auto mb-4"),
          attribute2("width", "600"),
          attribute2("viewBox", "0 0 400 533")
        ]),
        toList([
          defs(
            toList([]),
            toList([
              namespaced(
                "http://www.w3.org/2000/svg",
                "filter",
                toList([id("spotlight")]),
                toList([
                  fe_flood(
                    toList([
                      attribute2("flood-opacity", "1"),
                      attribute2("flood-color", model.hex),
                      attribute2("height", "100%"),
                      attribute2("width", "100%"),
                      attribute2("y", "0"),
                      attribute2("x", "0"),
                      attribute2("result", "floodFill")
                    ])
                  ),
                  fe_blend(
                    toList([
                      attribute2("mode", "luminosity"),
                      attribute2("in2", "floodFill"),
                      attribute2("in", "SourceGraphic")
                    ])
                  )
                ])
              ),
              mask2(
                toList([id("face")]),
                toList([
                  path(
                    toList([
                      attribute2("fill", "white"),
                      attribute2(
                        "d",
                        "M174 429C180.22 435.44 190.838 435.567 199.74 434.5C206.773 433.657 207.673 432.744 213.151 428.254C222 421 228.795 416.004 235.417 405.606C245.443 389.86 244.011 371.382 244.011 371.382C244.011 371.382 246.48 372.5 248.5 369C251 366.5 251.136 363.911 252 359.5C252.392 357.5 254.5 355.5 255 352C256 348.5 254.818 343.926 254.818 343.926L256.771 334.947C256.771 334.947 256.839 332.087 255.99 331.043C254.902 329.703 251.433 330.523 251.433 330.523C251.433 330.523 250.653 321.651 249.349 316.078C246.749 304.964 245.897 297.956 239.323 288.622C232.156 278.445 222.954 273.376 215.5 269.5C203 263 188.85 266.453 175.5 274C162.006 281.629 161.5 283.5 152.5 297.5C147 309 148.5 316.5 147.5 326.5C145.964 328 145 329 145 331C145.5 333 146 334.5 147 337C147 337.5 144.007 343.682 144.131 347.199C144.264 351 145.964 352.904 145.964 352.904L145.443 365.397C145.443 365.397 142 384.5 152 399C160.795 411.752 163.193 417.809 174 429Z"
                      )
                    ])
                  )
                ])
              )
            ])
          ),
          image(
            toList([
              href("/priv/static/grass.jpg"),
              attribute2("width", "100%")
            ])
          ),
          image(
            toList([
              href("/priv/static/grass.jpg"),
              attribute2("width", "100%"),
              attribute2("filter", "url(#spotlight)"),
              attribute2("mask", "url(#face)")
            ])
          ),
          rect(
            toList([
              attribute2("fill", "#363636"),
              attribute2("fill-opacity", ".8"),
              attribute2("x", "25"),
              attribute2("y", "85"),
              attribute2("width", to_string(width - 50)),
              attribute2("height", "160")
            ])
          ),
          namespaced(
            "http://www.w3.org/2000/svg",
            "text",
            toList([
              attribute2("z", "100"),
              attribute2("x", to_string(globalThis.Math.trunc(width / 2))),
              attribute2("y", "135"),
              attribute2("font-family", "Oswald"),
              attribute2("stroke", "black"),
              attribute2("stroke-width", "3"),
              attribute2("paint-order", "stroke fill"),
              attribute2("font-weight", "bold"),
              attribute2("text-transform", "uppercase"),
              attribute2("font-size", "40"),
              attribute2("fill", "white"),
              attribute2("text-anchor", "middle")
            ]),
            toList([
              tspan(
                toList([attribute2("font-size", to_string(colour_font_size))]),
                toList([text2("HE'S ")])
              ),
              tspan(
                toList([
                  attribute2("font-size", to_string(colour_font_size)),
                  attribute2("fill", model.hex)
                ]),
                toList([text2(uppercase(model.name))])
              ),
              tspan(
                toList([
                  attribute2("y", "180"),
                  attribute2("x", to_string(globalThis.Math.trunc(width / 2)))
                ]),
                toList([text2("FOR AN AMAZING")])
              ),
              tspan(
                toList([
                  attribute2("y", "225"),
                  attribute2("x", to_string(globalThis.Math.trunc(width / 2)))
                ]),
                toList([text2("REASON")])
              )
            ])
          )
        ])
      ),
      div(
        toList([class$("flex gap-2")]),
        toList([
          select(
            toList([
              class$(
                "bg-white w-full border-2 border-gray-200 rounded-md py-3 px-4"
              ),
              on_change((var0) => {
                return new UserSetColour(var0);
              })
            ]),
            map(
              colours,
              (colour) => {
                return option(
                  toList([
                    value(colour.hex),
                    selected(isEqual(colour, model))
                  ]),
                  colour.name
                );
              }
            )
          ),
          button(
            toList([
              class$(
                "bg-purple-500 flex items-center gap-2 transition-opacity hover:opacity-80 rounded-lg font-bold text-white py-3 px-4"
              ),
              on_click(new Random())
            ]),
            toList([
              svg(
                toList([
                  class$(
                    "lucide lucide-wand-sparkles-icon lucide-wand-sparkles"
                  ),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2("stroke", "currentColor"),
                  attribute2("fill", "none"),
                  attribute2("viewBox", "0 0 24 24"),
                  attribute2("height", "20"),
                  attribute2("width", "20"),
                  attribute2("xmlns", "http://www.w3.org/2000/svg")
                ]),
                toList([
                  path(
                    toList([
                      attribute2(
                        "d",
                        "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"
                      )
                    ])
                  ),
                  path(toList([attribute2("d", "m14 7 3 3")])),
                  path(toList([attribute2("d", "M5 6v4")])),
                  path(toList([attribute2("d", "M19 14v4")])),
                  path(toList([attribute2("d", "M10 2v2")])),
                  path(toList([attribute2("d", "M7 8H3")])),
                  path(toList([attribute2("d", "M21 16h-4")])),
                  path(toList([attribute2("d", "M11 3H9")]))
                ])
              ),
              text2("Random")
            ])
          )
        ])
      ),
      p(
        toList([class$("text-center mt-3 text-sm text-gray-500")]),
        toList([
          text2("made by "),
          a(
            toList([
              href("https://isaac.zone"),
              class$("text-gray-600 underline")
            ]),
            toList([text2("isaac")])
          ),
          text2(" using "),
          a(
            toList([
              href("https://gleam.run"),
              class$("text-gray-600 underline")
            ]),
            toList([text2("gleam + lustre")])
          ),
          text2(" and "),
          a(
            toList([
              href("https://xkcd.com/color/rgb/"),
              class$("text-gray-600 underline")
            ]),
            toList([text2("xkcd colours")])
          )
        ])
      )
    ])
  );
}
function main() {
  let app = application(init, update2, view);
  let provided_hash = document_hash();
  let $ = start3(app, "#app", provided_hash);
  if (!($ instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "dangenhentschel",
      16,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $, start: 422, end: 481, pattern_start: 433, pattern_end: 438 }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
