import { useState, useEffect, forwardRef } from "react";

import Select from "react-select";

const notes = ["Ab", "A", "Bb", "B", "C", "C#", "D", "Eb", "E", "F", "F#", "G"];
const ocataves = [1, 2, 3, 4, 5, 6, 7, 8];
const selectOptions = ocataves
  .map((octave) => notes.map((note) => `${note}${octave}`))
  .reverse()
  .reduce((prev, curr) => curr.concat(prev), [])
  .map((note) => ({ value: note, label: note }));
console.log("selectOptions", selectOptions);

export const NoteSetter = forwardRef(({ noteIndex }, ref) => {
  const [selectedNote, setSelectedNote] = useState(ref.current[noteIndex]);

  useEffect(() => {
    ref.current[noteIndex] = selectedNote;
  }, [selectedNote, noteIndex, ref]);

  return (
    <span>
      <Select
        defaultValue={{ value: selectedNote, label: selectedNote }}
        isSearchable={true}
        name={`note-select-${noteIndex}`}
        options={selectOptions}
        onChange={(newVal) => setSelectedNote(newVal.value)}
        styles={{
       
        }}
      />
    </span>
  );
});
