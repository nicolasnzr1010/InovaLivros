/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Acervo } from './components/Acervo';
import { Emprestimos } from './components/Emprestimos';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <DataProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'acervo' && <Acervo />}
        {activeTab === 'emprestimos' && <Emprestimos />}
      </Layout>
    </DataProvider>
  );
}
