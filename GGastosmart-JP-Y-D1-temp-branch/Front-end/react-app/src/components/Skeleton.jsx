import React from 'react'
import './Skeleton.css'

export const CardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-header"></div>
    <div className="skeleton-content">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
    </div>
  </div>
)

export const ChartSkeleton = () => (
  <div className="skeleton-chart">
    <div className="skeleton-bars">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton-bar" style={{ height: `${Math.random() * 60 + 40}%` }}></div>
      ))}
    </div>
  </div>
)

export const ListSkeleton = ({ count = 3 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-list-item">
        <div className="skeleton-circle"></div>
        <div className="skeleton-text">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    ))}
  </div>
)

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="skeleton-table">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton-table-row">
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
        <div className="skeleton-line short"></div>
      </div>
    ))}
  </div>
)

export default { CardSkeleton, ChartSkeleton, ListSkeleton, TableSkeleton }
