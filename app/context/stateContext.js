'use client'; // Marks this file and its imports as a Client Component

import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
    
    const [email, setEmail] = useState('');
    const [customerId, setCustomerId] = useState('');


    return (
        <UserContext.Provider value={{ email, setEmail,customerId,setCustomerId  }}>
            {children}
        </UserContext.Provider>
    );
}

// Custom hook to consume the context
export const user = () => useContext(UserContext);