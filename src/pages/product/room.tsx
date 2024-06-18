import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import RoomList from "@/components/page/room/RoomList";

function RoomPage() {
  return (
    <div>
      <RoomList />
    </div>
  );
}

RoomPage.getLayout = getDefaultLayout;
RoomPage.pageHeader = pageHeader;

export default RoomPage;
