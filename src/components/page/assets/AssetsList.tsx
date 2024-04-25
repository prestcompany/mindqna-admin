import { removeAsset } from "@/client/assets";
import useAssets from "@/hooks/useAssets";
import { Image, Modal, message } from "antd";
import { Loader, TrashIcon } from "lucide-react";
import useInfiniteScroll from "react-infinite-scroll-hook";

function AssetsList() {
  const [modal, contextHolder] = Modal.useModal();

  const { imgs, fetchMore, isLoading, hasNextPage } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

  const handleClickRemove = async (id: number) => {
    await modal.confirm({
      title: "정말로 삭제하시겠습니까?",
      content: (
        <Image
          width={200}
          height={200}
          src={imgs.find((img) => img.id === id)?.uri ?? ""}
          alt="removed"
          style={{ objectFit: "cover" }}
        />
      ),
      onOk: async () => {
        try {
          await removeAsset(id);
          window.location.reload();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  return (
    <>
      {contextHolder}

      <div className="flex flex-wrap">
        {imgs.map((item) => {
          return (
            <div key={item.id} className="relative">
              <Image width={200} height={200} src={item.uri} alt="asset" style={{ objectFit: "cover" }} />
              <button onClick={() => handleClickRemove(item.id)} className="absolute right-0 bottom-5">
                <TrashIcon color="red" />
              </button>
            </div>
          );
        })}
      </div>
      {hasNextPage ||
        (isLoading && (
          <div ref={sentryRef} className="flex items-center justify-center p-8">
            <Loader />
          </div>
        ))}
    </>
  );
}

export default AssetsList;
