import React from 'react';
import Providers from './Providers';
import ProtectedRoute from './ProtectedRoute';
import Profile from './Profile';

export default function ProfilePage() {
  return (
    <Providers>
      <ProtectedRoute redirectTo="/login">
        <Profile />
      </ProtectedRoute>
    </Providers>
  );
}