import Providers from "./Providers";
import MyListingsItem from "./MyListingsItem";

export default function ManageItemsplace() {
  return (
    <Providers>
      <div className="p-4">
        <MyListingsItem />
      </div>
    </Providers>
  );
}