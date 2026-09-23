import { useEffect, useRef, useMemo, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import type { GraphNode, GraphEdge } from '../../types';

class GraphErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TraceX] Cytoscape rendered a fatal error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'var(--danger)', background: 'var(--danger-muted)', height: '100%', borderRadius: 'var(--r-md)' }}>
          <h4>Graph Rendering Failed</h4>
          <p style={{ fontSize: 13, marginTop: 8 }}>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface InvestigationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect?: (node: GraphNode) => void;
  onEdgeSelect?: (edge: GraphEdge) => void;
  onFit?: (fitFn: () => void) => void;
}

export function InvestigationGraph({ nodes, edges, onNodeSelect, onEdgeSelect, onFit }: InvestigationGraphProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);

  const elements = useMemo(() => {
    // 1. Map all valid node IDs
    const validNodeIds = new Set(nodes.map(n => n.id));
    
    // 2. Filter edges to ensure both endpoints exist (defensive graph validation)
    const validEdges = edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));
    const invalidEdgeCount = edges.length - validEdges.length;
    
    if (invalidEdgeCount > 0) {
      console.warn(`[TraceX] Graph validation rejected ${invalidEdgeCount} invalid edges (missing source/target node). Nodes: ${nodes.length}, Valid Edges: ${validEdges.length}.`);
    }

    return [
      ...nodes.map(n => ({
        data: { id: n.id, label: n.label, type: n.type, hopDistance: n.hopDistance }
      })),
      ...validEdges.map(e => ({
        data: { id: e.id, source: e.source, target: e.target, value: e.value, hash: e.hash }
      }))
    ];
  }, [nodes, edges]);

  // Set up cytoscape stylesheet
  const stylesheet: any = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'font-size': '10px',
        'color': '#8888aa',
        'background-color': '#8888aa',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'width': 20,
        'height': 20,
        'font-family': 'monospace'
      }
    },
    {
      selector: 'node[type = "root"]',
      style: {
        'background-color': '#7c5cfc', // Purple for root
        'width': 30,
        'height': 30,
        'color': '#a78bfa',
        'font-weight': 'bold',
        'font-size': '12px'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': 'rgba(100, 100, 120, 0.4)',
        'target-arrow-color': 'rgba(100, 100, 120, 0.6)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier', // Allows multiple edges between same nodes
        'control-point-step-size': 30, // Spacing between parallel edges
        'arrow-scale': 1.2
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#fff',
        'background-color': '#3b82f6', // Highlight active node
        'color': '#fff',
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6',
        'width': 3,
        'z-index': 10
      }
    }
  ];

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.on('tap', 'node', (evt) => {
        const nodeData = evt.target.data();
        if (onNodeSelect) {
          onNodeSelect({
            id: nodeData.id,
            label: nodeData.label,
            type: nodeData.type,
            hopDistance: nodeData.hopDistance
          });
        }
      });

      cyRef.current.on('tap', 'edge', (evt) => {
        const edgeData = evt.target.data();
        if (onEdgeSelect) {
          onEdgeSelect({
            id: edgeData.id,
            source: edgeData.source,
            target: edgeData.target,
            value: edgeData.value,
            hash: edgeData.hash
          });
        }
      });

      // Export fit function to parent if needed
      if (onFit) {
        onFit(() => {
          cyRef.current?.fit();
        });
      }
    }
    
    return () => {
      if (cyRef.current) {
        cyRef.current.removeListener('tap', 'node');
        cyRef.current.removeListener('tap', 'edge');
      }
    };
  }, [onNodeSelect, onEdgeSelect, onFit, elements]);

  // Run layout when elements change
  useEffect(() => {
    if (cyRef.current) {
      const layout = cyRef.current.layout({
        name: 'cose',
        animate: false,
        padding: 50,
        nodeRepulsion: (_node: any) => 400000,
        idealEdgeLength: (_edge: any) => 100,
        edgeElasticity: (_edge: any) => 100,
      } as any);
      layout.run();
    }
  }, [elements]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GraphErrorBoundary>
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          cy={(cy) => { cyRef.current = cy; }}
          wheelSensitivity={0.1}
          maxZoom={5}
          minZoom={0.1}
        />
      </GraphErrorBoundary>
    </div>
  );
}
