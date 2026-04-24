interface FormItemProps {
  id?: number | "";
  title: string;
  roleOptions: any[];
  roleId: number | "";
  zoneOptions: any[];
  zoneIds: number[];
  nickname: string;
  username: string;
  password: string;
  phone: string | number;
  email: string;
  sex: string | number;
  status: number;
  remark: string;
}
interface FormProps {
  formInline: FormItemProps;
}

interface RoleFormItemProps {
  username: string;
  nickname: string;
  roleOptions: any[];
  ids: number | "";
}
interface RoleFormProps {
  formInline: RoleFormItemProps;
}

export type { FormItemProps, FormProps, RoleFormItemProps, RoleFormProps };
