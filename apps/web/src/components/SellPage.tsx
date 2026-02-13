import React from 'react';
import Providers from './Providers';
import ProtectedRoute from './ProtectedRoute';
import SellItemForm from './SellItemForm';

export default function SellPage() {
  return (
    <Providers>
      <ProtectedRoute redirectTo="/login">
        <SellItemForm />
      </ProtectedRoute>
    </Providers>
  );
}
