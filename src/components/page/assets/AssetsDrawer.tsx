import { ImgItem } from "@/client/types";
import useAssets from "@/hooks/useAssets";
import { Button, Drawer, Image } from "antd";
import { Loader } from "lucide-react";
import { useState } from "react";
import useInfiniteScroll from "react-infinite-scroll-hook";

type AssetsDrawerProps = {
  onClick: (img: ImgItem) => void;
};

function AssetsDrawer({ onClick }: AssetsDrawerProps) {
  const [childrenDrawer, setChildrenDrawer] = useState(false);

  const { imgs, isLoading, fetchMore, hasNextPage } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

  const showChildrenDrawer = () => {
    setChildrenDrawer(true);
  };

  const onChildrenDrawerClose = () => {
    setChildrenDrawer(false);
  };

  return (
    <>
      <Button type="primary" onClick={showChildrenDrawer}>
        이미지 선택
      </Button>
      <Drawer title="이미지 선택" width={600} closable={false} onClose={onChildrenDrawerClose} open={childrenDrawer}>
        <div className="flex flex-wrap">
          {imgs.map((item) => {
            const handleClick = () => {
              onClick(item);
              onChildrenDrawerClose();
            };
            return (
              <button onClick={handleClick} key={item.id} className="hover:opacity-35">
                <Image
                  width={180}
                  height={180}
                  src={item.uri}
                  alt="asset"
                  style={{ objectFit: "contain" }}
                  preview={false}
                />
              </button>
            );
          })}
        </div>
        {hasNextPage ||
          (isLoading && (
            <div ref={sentryRef} className="flex items-center justify-center p-8">
              <Loader />
            </div>
          ))}
      </Drawer>
    </>
  );
}

export default AssetsDrawer;
