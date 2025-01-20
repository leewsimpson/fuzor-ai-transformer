import * as React from 'react';
import { TransformerLibrary } from '../../../../src/shared/transformerLibrary';
import { on } from 'events';

// interface ExplorerProps {
//   transformerLibrary: TransformerLibrary;
// }

const Folder: React.FC<{ name: string; children: React.ReactNode, library: TransformerLibrary, onNameClick: (transfomerLibrarySelected: TransformerLibrary) => void, isSelected: boolean }> = ({ name, children, library, onNameClick, isSelected }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    onNameClick(library);
  };

  return (
    <li>
      <div
        onClick={handleClick}
        className={`flex items-center cursor-pointer transition-colors ${isSelected ? 'text-blue-500' : 'hover:text-blue-500'}`}
      >
        <span className={`mr-2 codicon ${isOpen ? 'codicon-folder-opened' : 'codicon-folder'}`}></span>
        <span className="font-medium">{name}</span>
      </div>
      {isOpen && children && <ul className="pl-6 mt-1 space-y-1 border-l border-gray-300">{children}</ul>}
    </li>
  );
};



// Recursive Component
const Explorer: React.FC<{ library: TransformerLibrary; onFolderClick: (transfomerLibrarySelected: TransformerLibrary) => void }> = ({ library, onFolderClick }) => {
  const [selectedLibrary, setSelectedLibrary] = React.useState<TransformerLibrary | null>(null);

  const handleFolderClick = (library: TransformerLibrary) => {
    setSelectedLibrary(library);
    onFolderClick(library);
  };

  const renderItem = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null && !('name' in value)) {
      // Only render folders with sub-items, excluding transformerConfigs
      const hasSubitems = Object.keys(value).some(subKey => typeof value[subKey] === 'object' && value[subKey] !== null && !('name' in value[subKey]));
      if (hasSubitems) {
        return (
          <Folder key={key} name={key} library={value} onNameClick={handleFolderClick} isSelected={selectedLibrary === value}>
            <Explorer library={value} onFolderClick={handleFolderClick} />
          </Folder>
        );
      }
    }
    return null;
  };

  const entries = Object.entries(library);
  if (!entries || entries.length === 0) {
    return null; // Return null if the folder is empty
  }

  return (
    <ul className="space-y-2">
      {entries.map(([key, value]) => renderItem(key, value))}
    </ul>
  );
};


export default Explorer;
