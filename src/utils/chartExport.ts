import * as echarts from "echarts";

export async function downloadChartAsImage(
  el: HTMLElement | null,
  filename = "chart"
): Promise<void> {
  if (!el) return;

  // el có thể là chính div ECharts ($el của component), hoặc wrapper chứa div ECharts
  const chartEl: HTMLElement | null =
    echarts.getInstanceByDom(el)
      ? el
      : (el.querySelector<HTMLElement>("[_echarts_instance_]") ??
         (el.firstElementChild as HTMLElement | null));

  if (!chartEl) return;

  const chart = echarts.getInstanceByDom(chartEl);
  if (!chart) return;

  const dataURL = chart.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#fff"
  });

  if (dataURL.startsWith("data:image/svg+xml")) {
    await svgToPng(dataURL, chartEl, filename);
  } else {
    triggerDownload(dataURL, `${filename}.png`);
  }
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function svgToPng(
  svgDataUrl: string,
  containerEl: HTMLElement,
  filename: string
): Promise<void> {
  return new Promise(resolve => {
    const w = containerEl.clientWidth  || 800;
    const h = containerEl.clientHeight || 400;
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width  = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      triggerDownload(canvas.toDataURL("image/png"), `${filename}.png`);
      resolve();
    };
    img.src = svgDataUrl;
  });
}
