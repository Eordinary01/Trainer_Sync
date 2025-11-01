import React, { useState } from 'react';

export default function AdminDashboard() {
    // Mock Data for Admin Dashboard (Replaced by API calls later)
    const stats = [
        { title: 'Total Trainers', value: 45, color: 'blue', icon: '👤' },
        { title: 'Checked In Today', value: 38, color: 'green', icon: '✅' },
        { title: 'Pending Leave Requests', value: 7, color: 'orange', icon: '⏳' },
    ];

    const trainers = [
        { id: 'T001', name: 'Alex Johnson', client: 'Alpha Corp', status: 'Active' },
        { id: 'T002', name: 'Sarah Lee', client: 'Beta Solutions', status: 'Active' },
        { id: 'T003', name: 'Mike Chen', client: 'Alpha Corp', status: 'Inactive' },
    ];

    const pendingLeaves = [
        { id: 'L001', trainer: 'Alex Johnson', type: 'Sick', dates: '2025-11-05', reason: 'Fever' },
        { id: 'L002', trainer: 'Sarah Lee', type: 'Casual', dates: '2025-11-15 to 17', reason: 'Vacation' },
    ];

    const handleAction = (type, id) => {
        alert(`${type} action executed for Leave ID: ${id}`);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 1. Header (Same as Trainer Dashboard for consistency) */}
            <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-blue-600">TrainerSync - Admin</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-500 hover:text-blue-600 cursor-pointer text-xl">
                        🔔
                    </span>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        HR
                    </div>
                </div>
            </header>

            <main className="p-4 md:p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Admin Overview (FR5.2)</h2>

                {/* 2. KPI Cards (Overview Stats) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {stats.map((stat) => (
                        <div key={stat.title} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-gray-400">
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <div className="flex items-center mt-1">
                                <span className={`text-4xl text-${stat.color}-500 mr-3`}>{stat.icon}</span>
                                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Pending Leave Requests Table */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Pending Leave Requests (FR4.3)</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingLeaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leave.trainer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{leave.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{leave.dates}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleAction('Approved', leave.id)} className="text-green-600 hover:text-green-900 mr-4">Approve</button>
                                            <button onClick={() => handleAction('Rejected', leave.id)} className="text-red-600 hover:text-red-900">Reject</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Trainer List Table (Profile Management FR2.1) */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">All Trainer Profiles</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {trainers.map((trainer) => (
                                    <tr key={trainer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trainer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.client}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${trainer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {trainer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => alert(`Editing ${trainer.name}`)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                            <button onClick={() => alert(`Deactivating ${trainer.name}`)} className="text-red-600 hover:text-red-900">Deactivate</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}