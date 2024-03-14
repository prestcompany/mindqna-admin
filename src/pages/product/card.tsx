import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import CardForm from "@/components/page/card/CardForm";
import CardList from "@/components/page/card/CardList";

function CardPage() {
  return (
    <div>
      <CardForm />
      <CardList />
    </div>
  );
}

CardPage.getLayout = getDefaultLayout;
CardPage.pageHeader = pageHeader;

export default CardPage;
