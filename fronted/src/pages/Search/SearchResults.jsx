import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/api.jsx';
import { useNavigate } from 'react-router-dom';
import { Search, Package, FileText, ShoppingCart } from 'lucide-react';
import { ClipLoader } from 'react-spinners';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState({ projects: [], invoices: [], orders: [] });
    const [loading, setLoading] = useState(true);
    const query = searchParams.get('query');
    const navigate = useNavigate();

    useEffect(() => {
        if (query) {
            setLoading(true);
            Promise.all([
                api.get(`/projects/search?query=${query}`),
                api.get(`/invoices/search?query=${query}`),
                api.get(`/orders/search`, { params: { query: query } })
            ])
            .then(([projectsRes, invoicesRes, ordersRes]) => {
                setResults({
                    projects: projectsRes.data.projects || [],
                    invoices: invoicesRes.data.invoices || [],
                    orders: ordersRes.data || []
                });
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
                setLoading(false);
            });
        }
    }, [query]); // כאן אנחנו מאזינים לשינוי ב-query
    
    if (!query) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-xl text-slate-600">נא להזין מילה לחיפוש</p>
                </div>
            </div>
        );
    }

    const formatNumber = (num) => (num ? num.toLocaleString() : "0");

    const ResultCard = ({ item, type, onClick }) => {
        const getGradient = () => {
            switch (type) {
                case 'project':
                    return 'from-blue-500 to-cyan-500';
                case 'invoice':
                    return 'from-purple-500 to-pink-500';
                case 'order':
                    return 'from-amber-500 to-orange-500';
                default:
                    return 'from-gray-500 to-slate-500';
            }
        };

        const getIcon = () => {
            switch (type) {
                case 'project':
                    return <Package className="w-6 h-6" />;
                case 'invoice':
                    return <FileText className="w-6 h-6" />;
                case 'order':
                    return <ShoppingCart className="w-6 h-6" />;
                default:
                    return null;
            }
        };

        return (
            <div
                onClick={onClick}
                className={`bg-gradient-to-r ${getGradient()} p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 text-white w-full md:w-72 mx-2 mb-4`}
            >
                <div className="flex items-center justify-between mb-4">
                    {getIcon()}
                    <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
                        {type === 'project' ? 'פרוייקט' : type === 'invoice' ? 'חשבונית' : 'הזמנה'}
                    </div>
                </div>
                
                <div className="space-y-3">
                    {type === 'project' && (
                        <>
                            <h3 className="text-xl font-bold">{item.name}</h3>
                            <p className="text-white/90">תקציב: ₪{formatNumber(item.budget)}</p>
                        </>
                    )}
                    {type === 'invoice' && (
                        <>
                            <h3 className="text-xl font-bold">חשבונית מס׳ {item.invoiceNumber}</h3>
                            <p className="text-white/90">סכום: ₪{formatNumber(item.sum)}</p>
                            <p className="text-white/90">פרוייקט: {item.projectName}</p>
                        </>
                    )}
                    {type === 'order' && (
                        <>
                            <h3 className="text-xl font-bold">הזמנה מס׳ {item.orderNumber}</h3>
                            <p className="text-white/90">סכום: ₪{formatNumber(item.sum)}</p>
                            <p className="text-white/90">פרוייקט: {item.projectName}</p>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderResults = () => {
        const { projects, invoices, orders } = results;

        if (loading) {
            return (
              <div className="flex flex-col justify-center items-center h-64">
                <ClipLoader size={100} color="#3498db" loading={loading} />
                <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
              </div>
            );
          }

        if (projects.length === 0 && invoices.length === 0 && orders.length === 0) {
            return (
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-xl text-slate-600">לא נמצאו תוצאות עבור "{query}"</p>
                </div>
            );
        }

        return (
            <div className=" ">
                {projects.length > 0 && (
                    <section >
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-500" />
                            <span>פרוייקטים</span>
                        </h2>
                        <div className="flex flex-auto gap-8">
                        {projects.map(project => (
                                <ResultCard
                                    key={project._id}
                                    item={project}
                                    type="project"
                                    onClick={() => navigate(`/project/${project._id}`)}
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"

                                />
                            ))}
                        </div>
                    </section>
                )}

{invoices.length > 0 && (
    <section className="animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />
            <span>חשבוניות</span>
        </h2>
        <div className="flex flex-wrap gap-8">
            {invoices.map(invoice => (
                <ResultCard
                    key={invoice._id}
                    item={invoice}
                    type="invoice"
                    onClick={() => navigate(`/invoice/${invoice._id}`)}
                    className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4"  // 3 או 4 פריטים בשורה, תלוי בגודל המסך
                />
            ))}
        </div>
    </section>
)}

{orders.length > 0 && (
    <section className="animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            <span>הזמנות</span>
        </h2>
        <div className="flex flex-wrap gap-8">
            {orders.map(order => (
                <ResultCard
                    key={order._id}
                    item={order}
                    type="order"
                    onClick={() => navigate(`/order/${order._id}`)}
                    className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4"  // 3 או 4 פריטים בשורה, תלוי בגודל המסך
                />
            ))}
        </div>
    </section>
)}

            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
                    <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                        <Search className="w-8 h-8" />
                        <span>תוצאות החיפוש עבור "{query}"</span>
                    </h1>
                    {renderResults()}
                </div>
            </div>
        </div>
    );
};

export default SearchResults;