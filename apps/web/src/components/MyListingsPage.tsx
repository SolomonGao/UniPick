import React from 'react';
import Providers from './Providers';
import ProtectedRoute from './ProtectedRoute';
import MyListingsItem from './MyListingsItem';

export default function MyListingsPage() {
  return (
    <Providers>
      <ProtectedRoute redirectTo="/login">
        <MyListingsItem />
      </ProtectedRoute>
    </Providers>
  );
}
