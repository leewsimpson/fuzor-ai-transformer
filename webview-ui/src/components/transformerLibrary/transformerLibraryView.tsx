import React, { useState } from 'react';
import { TransformerLibrary } from '../../../../src/shared/transformerLibrary';
import Explorer from './explorer';
import TransformerList from './transformerList';
import Split from '@uiw/react-split';

const TransformerLibraryView: React.FC<{ library: TransformerLibrary }> = ({ library }) => {
  const [transformers, setTransformers] = useState<TransformerLibrary>(library);

  const handleFolderClick = (transfomerLibrarySelected: TransformerLibrary) => {
    const updatedLibrary = { ...library, ...transfomerLibrarySelected };
    setTransformers(updatedLibrary);
  };

  return (
    <Split style={{ display: 'flex', width: '100%'}} lineBar>
      <div style={{ width: '250px', paddingRight: '20px' }}>
        <h2 className="text-xl font-bold border-b-2 border-gray-300" style={{marginBottom: '10px'}}>Browse</h2>
        <Explorer library={library} onFolderClick={handleFolderClick} />
      </div>
      <div style={{ width: 'calc(100% - 250px)', paddingLeft: '10px' }}>
        <h2 className="text-xl font-bold border-b-2 border-gray-300" style={{marginBottom: '10px'}}>Transformers</h2>
        <TransformerList transformers={transformers} />
      </div>
    </Split>
  );
};

export default TransformerLibraryView;
