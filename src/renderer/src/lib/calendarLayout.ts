export interface TimedItem {
  id: string
  /** Minutes from midnight. */
  start: number
  end: number
}

export interface PlacedItem<T extends TimedItem> {
  item: T
  column: number
  columns: number
}

/**
 * Lays out overlapping items side by side, like Google Calendar: items that
 * overlap form a cluster, each gets the first free column, and every item in
 * a cluster shares the cluster's column count.
 */
export function layoutDay<T extends TimedItem>(items: T[]): PlacedItem<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const placed: PlacedItem<T>[] = []
  let cluster: PlacedItem<T>[] = []
  let columnsEnd: number[] = []
  let clusterEnd = -1

  const closeCluster = () => {
    for (const p of cluster) p.columns = columnsEnd.length
    cluster = []
    columnsEnd = []
  }

  for (const item of sorted) {
    if (item.start >= clusterEnd) closeCluster()
    let column = columnsEnd.findIndex((end) => end <= item.start)
    if (column === -1) {
      column = columnsEnd.length
      columnsEnd.push(item.end)
    } else {
      columnsEnd[column] = item.end
    }
    const p = { item, column, columns: 1 }
    cluster.push(p)
    placed.push(p)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  closeCluster()
  return placed
}
