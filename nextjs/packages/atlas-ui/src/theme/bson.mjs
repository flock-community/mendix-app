// A minimal BSON reader for Mendix model units (.mxunit files and MPR v1 blobs).
// Mendix stores every list with a leading int32 "list kind" marker; it is dropped.

function cstring(buf, at) {
    const end = buf.indexOf(0, at);
    return [buf.toString("utf8", at, end), end + 1];
}

function readDocument(buf, at, asArray) {
    const size = buf.readInt32LE(at);
    const end = at + size - 1;
    let pos = at + 4;
    const out = asArray ? [] : {};
    while (pos < end) {
        const type = buf[pos++];
        let name;
        [name, pos] = cstring(buf, pos);
        let value;
        switch (type) {
            case 0x01:
                value = buf.readDoubleLE(pos);
                pos += 8;
                break;
            case 0x02: {
                const length = buf.readInt32LE(pos);
                value = buf.toString("utf8", pos + 4, pos + 4 + length - 1);
                pos += 4 + length;
                break;
            }
            case 0x03:
            case 0x04:
                [value, pos] = readDocument(buf, pos, type === 0x04);
                break;
            case 0x05: {
                const length = buf.readInt32LE(pos);
                const subtype = buf[pos + 4];
                const data = buf.subarray(pos + 5, pos + 5 + length);
                value = (subtype === 3 || subtype === 4) && length === 16 ? guidFromBytes(data) : data.toString("base64");
                pos += 5 + length;
                break;
            }
            case 0x07:
                value = buf.toString("hex", pos, pos + 12);
                pos += 12;
                break;
            case 0x08:
                value = buf[pos] === 1;
                pos += 1;
                break;
            case 0x09:
            case 0x12:
                value = Number(buf.readBigInt64LE(pos));
                pos += 8;
                break;
            case 0x0a:
                value = null;
                break;
            case 0x10:
                value = buf.readInt32LE(pos);
                pos += 4;
                break;
            default:
                throw new Error(`Unsupported BSON type 0x${type.toString(16)} at ${pos}`);
        }
        if (asArray) out.push(value);
        else out[name] = value;
    }
    if (asArray && typeof out[0] === "number") out.shift();
    return [out, end + 1];
}

export function decodeBson(buf) {
    return readDocument(buf, 0, false)[0];
}

/** Formats 16 GUID bytes the way .NET (and so Mendix) does: little-endian first three groups. */
export function guidFromBytes(bytes) {
    const b = Buffer.from(bytes);
    const hex = i => b[i].toString(16).padStart(2, "0");
    const group = idx => idx.map(hex).join("");
    return [group([3, 2, 1, 0]), group([5, 4]), group([7, 6]), group([8, 9]), group([10, 11, 12, 13, 14, 15])].join("-");
}
