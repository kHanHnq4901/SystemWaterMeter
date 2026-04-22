export const getPickerShortcuts = (): Array<{
  text: string;
  value: Date | Function;
}> => [
  {
    text: "Hôm nay",
    value: () => {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(); e.setHours(23, 59, 59, 999);
      return [s, e];
    }
  },
  {
    text: "Hôm qua",
    value: () => {
      const s = new Date(); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
      return [s, e];
    }
  },
  {
    text: "7 ngày qua",
    value: () => {
      const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      const e = new Date(); e.setHours(23, 59, 59, 999);
      return [s, e];
    }
  },
  {
    text: "Tháng này",
    value: () => {
      const today = new Date();
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      e.setHours(23, 59, 59, 999);
      return [s, e];
    }
  },
  {
    text: "Tháng trước",
    value: () => {
      const today = new Date();
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      e.setHours(23, 59, 59, 999);
      return [s, e];
    }
  }
];
