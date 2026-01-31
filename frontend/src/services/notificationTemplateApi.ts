import adminApi from "./adminApi";

export interface NotificationTemplate {
  id: string;
  templateName: string;
  templateType: string; // AnalysisComplete, HighRiskAlert, PaymentSuccess, PackageExpiring, MessageReceived, SystemAlert, Custom
  titleTemplate: string;
  contentTemplate: string;
  variables?: string; // JSON string
  isActive: boolean;
  language: string; // vi, en
  createdDate?: string;
  createdBy?: string;
  updatedDate?: string;
  updatedBy?: string;
  note?: string;
}

export interface CreateNotificationTemplateDto {
  templateName: string;
  templateType: string;
  titleTemplate: string;
  contentTemplate: string;
  variables?: Record<string, string>;
  isActive?: boolean;
  language?: string;
  note?: string;
}

export interface UpdateNotificationTemplateDto {
  templateName?: string;
  templateType?: string;
  titleTemplate?: string;
  contentTemplate?: string;
  variables?: Record<string, string>;
  isActive?: boolean;
  language?: string;
  note?: string;
}

export interface PreviewTemplateDto {
  variables?: Record<string, string>;
}

export interface TemplatePreview {
  templateId: string;
  templateName: string;
  previewTitle: string;
  previewContent: string;
  variables: Record<string, string>;
}

const notificationTemplateApi = {
  getAll: async (
    search?: string,
    templateType?: string,
    isActive?: boolean,
    language?: string,
  ): Promise<NotificationTemplate[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (templateType) params.templateType = templateType;
    if (isActive !== undefined) params.isActive = isActive;
    if (language) params.language = language;

    const res = await adminApi.get("/admin/notification-templates", { params });
    return res.data;
  },

  getById: async (id: string): Promise<NotificationTemplate> => {
    const res = await adminApi.get(`/admin/notification-templates/${id}`);
    return res.data;
  },

  create: async (
    dto: CreateNotificationTemplateDto,
  ): Promise<{ id: string }> => {
    const res = await adminApi.post("/admin/notification-templates", dto);
    return res.data;
  },

  update: async (
    id: string,
    dto: UpdateNotificationTemplateDto,
  ): Promise<void> => {
    await adminApi.put(`/admin/notification-templates/${id}`, dto);
  },

  setStatus: async (id: string, isActive: boolean): Promise<void> => {
    await adminApi.patch(`/admin/notification-templates/${id}/status`, {
      isActive,
    });
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/admin/notification-templates/${id}`);
  },

  preview: async (
    id: string,
    variables?: Record<string, string>,
  ): Promise<TemplatePreview> => {
    const res = await adminApi.post(
      `/admin/notification-templates/${id}/preview`,
      { variables },
    );
    return res.data;
  },

  send: async (
    templateId: string,
    payload: {
      targetType: "all" | "user";
      userId?: string;
      variables?: Record<string, string>;
    },
  ): Promise<{ message: string; count: number }> => {
    const res = await adminApi.post<{ message: string; count: number }>(
      `/admin/notification-templates/${templateId}/send`,
      payload,
    );
    return res.data;
  },
};

export default notificationTemplateApi;
