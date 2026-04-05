import { useEffect, useState } from "react";
import imgUrl from "../../assets/tikhonbelousko.png";

interface SourceImage {
  source: HTMLCanvasElement | null;
  width: number;
  height: number;
  loaded: boolean;
}

export function useSourceImage(): SourceImage {
  const [state, setState] = useState<SourceImage>({
    source: null,
    width: 0,
    height: 0,
    loaded: false,
  });

  useEffect(() => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      const MAX_W = 800;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_W) {
        h = Math.round(h * (MAX_W / w));
        w = MAX_W;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      setState({ source: canvas, width: w, height: h, loaded: true });
    };
  }, []);

  return state;
}
