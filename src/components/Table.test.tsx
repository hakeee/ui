import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./Table.js";

describe("Table", () => {
  it("renders a semantic table with headers and cells", () => {
    render(
      <Table>
        <TableCaption>Sessions</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table", { name: "Sessions" });
    expect(within(table).getByRole("columnheader", { name: "Client" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "alice" })).toBeInTheDocument();
  });
});
