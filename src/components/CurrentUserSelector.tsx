'use client';

import { useUser } from '@/context/UserContext';

const CurrentUserSelector = () => {
  const { users, currentUser, setCurrentUser } = useUser();

  const handleSelectUser = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = parseInt(e.target.value, 10);
    const selectedUser = users.find((user) => user.id === userId) || null;
    setCurrentUser(selectedUser);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <label htmlFor="user-selector" className="block text-lg font-medium text-gray-700 mb-2">
        Login As:
      </label>
      <select
        id="user-selector"
        value={currentUser?.id || ''}
        onChange={handleSelectUser}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      >
        <option value="" disabled>
          Select a user
        </option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrentUserSelector;