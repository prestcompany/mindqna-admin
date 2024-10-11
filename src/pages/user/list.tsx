import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import UserList from '@/components/page/user/UserList';

function UserPage() {
  return (
    <div>
      <UserList />
    </div>
  );
}

UserPage.getLayout = getDefaultLayout;
UserPage.pageHeader = pageHeader;

export default UserPage;
