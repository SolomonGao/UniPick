import React from 'react';
import Providers from './Providers';
import UserMenu from './UserMenu';

export default function UserMenuWrapper() {
  return (
    <Providers>
      <UserMenu />
    </Providers>
  );
}
