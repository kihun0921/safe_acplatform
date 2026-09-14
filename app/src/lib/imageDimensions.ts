// 회원사가 업로드한 안전보건경영방침 이미지(PNG/JPEG/WebP)를 DOCX/PDF에 원본
// 비율대로 삽입하려면 픽셀 크기를 알아야 한다. 업로드를 png/jpeg/webp로만
// 제한해 두었으므로(WizardScreen.tsx의 file input accept), 이 세 포맷만 직접
// 파싱하는 아주 작은 파서로 충분하다 — 범용 이미지 파싱 라이브러리(예:
// image-size)는 이 프로젝트가 쓰지 않는 ICNS/JXL/HEIF 등 포맷 파서에서 해결되지
// 않은 고위험 DoS 취약점이 있어 의도적으로 의존성을 추가하지 않았다.
export function readImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: 시그니처(8바이트) 뒤 IHDR 청크의 폭/높이가 고정 오프셋(16, 20)에 4바이트씩 있다.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: SOFn(0xC0~0xCF, 0xC4/0xC8/0xCC 제외) 마커를 찾아 그 안의 높이/폭을 읽는다.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      const segmentLength = buf.readUInt16BE(offset + 2);
      if (isSof) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + segmentLength;
    }
    return null;
  }

  // WebP (VP8/VP8L/VP8X 전부 RIFF 컨테이너, 가장 흔한 단순 VP8X/VP8 케이스만 처리).
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height };
    }
    if (chunk === "VP8 " && buf.length >= 30) {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
  }

  return null;
}
