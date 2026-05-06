import { http } from "@/utils/http";

type R = { code: number; message: string; data?: any };

export const getReportVolumeList = () =>
  http.request<R>("get", "/api/report-volume/list");

export const addReportVolume = (data: any) =>
  http.request<R>("post", "/api/report-volume/add", { data });

export const updateReportVolume = (id: number, data: any) =>
  http.request<R>("put", `/api/report-volume/update/${id}`, { data });

export const deleteReportVolume = (id: number) =>
  http.request<R>("delete", `/api/report-volume/delete/${id}`);

export const getReportVolumeDetail = (rptId: number) =>
  http.request<R>("get", `/api/report-volume/${rptId}/detail`);

export const addReportGroup = (data: any) =>
  http.request<R>("post", "/api/report-volume/group/add", { data });

export const updateReportGroup = (id: number, data: any) =>
  http.request<R>("put", `/api/report-volume/group/update/${id}`, { data });

export const deleteReportGroup = (id: number) =>
  http.request<R>("delete", `/api/report-volume/group/delete/${id}`);

export const addGroupMeter = (
  groupId: number,
  data: { meterNos: string[] }
) => http.request<R>("post", `/api/report-volume/group/${groupId}/meter/add`, { data });

export const removeGroupMeter = (
  groupId: number,
  data: { meterNo: string }
) =>
  http.request<R>(
    "delete",
    `/api/report-volume/group/${groupId}/meter/remove`,
    { data }
  );

export const calculateReportVolume = (rptId: number) =>
  http.request<R>("post", `/api/report-volume/${rptId}/calculate`);
