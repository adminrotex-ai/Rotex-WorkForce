import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { DepartmentStock } from '../../types';
import { getDepartmentStock, getActiveDepartments } from '../../database/operations';
import { Warehouse, ChevronRight, Package } from 'lucide-react';

export default function DepartmentStockList() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const [allStock, setAllStock] = useState<DepartmentStock[]>([]);
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [stock, depts] = await Promise.all([
      getDepartmentStock(),
      getActiveDepartments(),
    ]);
    setAllStock(stock);
    setDepartments(depts);
    setLoaded(true);
  };

  const deptStock = (deptKey: string) => allStock.filter(s => s.department === deptKey);

  const totalQty = (deptKey: string) =>
    deptStock(deptKey).reduce((s, item) => s + item.quantity, 0);

  const sizeCount = (deptKey: string) =>
    new Set(deptStock(deptKey).filter(s => s.size).map(s => s.size)).size;

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-400 mt-1">Department-wise stock overview</p>
        </div>
      </div>

      {loaded && departments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Warehouse size={40} className="mx-auto mb-3 opacity-40" />
          <p>No departments found</p>
        </div>
      ) : departments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const stock = deptStock(dept.key);
            const total = totalQty(dept.key);
            const sizes = sizeCount(dept.key);

            return (
              <button
                key={dept.key}
                onClick={() => navigate(`/stock/${dept.key}`)}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-left hover:bg-white/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-gold-300 flex items-center justify-center">
                    <Package size={20} className="text-dark-800" />
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors mt-1" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mt-3">{dept.label}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-gray-400">
                    {stock.length} item{stock.length !== 1 ? 's' : ''}
                  </span>
                  {total > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {total} total
                    </span>
                  )}
                  {sizes > 0 && (
                    <span className="text-[11px] px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full font-bold">
                      {sizes} size{sizes !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
