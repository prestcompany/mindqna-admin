import { deleteSquareLibrary, LibraryData } from '@/client/square-library';
import { message } from 'antd';

export const createDeleteHandler = (modal: any, refetch: () => Promise<any>) => {
  return (value: LibraryData) => {
    modal.confirm({
      title: `삭제 (${value.name})`,
      onOk: async () => {
        try {
          if (!value.id) return;
          await deleteSquareLibrary(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };
};

export const truncateText = (text: string, limit: number) => {
  if (text.length > limit) {
    return `${text.slice(0, limit)}...`;
  }
  return text;
};
