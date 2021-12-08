/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from "graphql";

const PreferenceType = new GraphQLObjectType({
  name: "Preference",
  fields: {
    like: { type: GraphQLString },
    dislike: { type: GraphQLString },
  },
});

const PersonType = new GraphQLObjectType({
  name: "Person",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    age: { type: GraphQLInt },
    preference: { type: PreferenceType },
  },
});

const peopleData = [
  {
    id: 1,
    name: "John Smith",
    age: 25,
    preference: {
      like: "cat",
      dislike: "dog",
    },
  },
  {
    id: 2,
    name: "Sara Smith",
    age: 30,
    preference: {
      like: "lion",
      dislike: "apple",
    },
  },
  {
    id: 3,
    name: "Budd Deey",
    age: 41,
    preference: {
      like: "computer",
      dislike: "swimming",
    },
  },
];

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    people: {
      type: new GraphQLList(PersonType),
      args: {
        name: { type: GraphQLString },
      },
      resolve: (_, { name }) => {
        if (name) {
          return peopleData.filter((p) => p.name.includes(name));
        } else {
          return peopleData;
        }
      },
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType });

/*** LINK ***/
import { graphql, print } from "graphql";
import { ApolloLink, Observable } from "@apollo/client";
function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const link = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;
    await delay(300);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

/*** APP ***/
import React from "react";
import { render } from "react-dom";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
} from "@apollo/client";
import "./index.css";
import { BrowserRouter, Routes, Route, Link, Outlet } from "react-router-dom";

export const PEOPLE_NAME_ONLY_FRAGMENT = gql`
  fragment PeopleNameOnly on Person {
    id
    name
  }
`;

export const PEOPLE_ALL_FRAGMENT = gql`
  fragment PeopleAll on Person {
    id
    name
    age
    preference {
      like
      dislike
    }
  }
`;

const GET_PEOPLE_NAME_ONLY = gql`
  query GetPeople($name: String) {
    people(name: $name) {
      ...PeopleNameOnly
    }
  }
  ${PEOPLE_NAME_ONLY_FRAGMENT}
`;

const GET_PEOPLE = gql`
  query GetPeople($name: String) {
    people(name: $name) {
      ...PeopleAll
    }
  }
  ${PEOPLE_ALL_FRAGMENT}
`;

function Home() {
  const { loading, data, error } = useQuery(GET_PEOPLE_NAME_ONLY, {
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-and-network",
    variables: {
      name: "John",
    },
  });

  return (
    <>
      <h2>People name includes John</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {data?.people.map((person) => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function PeopleAll() {
  const [name, setName] = React.useState("Sara");
  const { loading, data } = useQuery(GET_PEOPLE, {
    fetchPolicy: "cache-and-network",
    // nextFetchPolicy: "cache-and-network",
    variables: {
      name,
    },
  });

  function renderPreference({ like, dislike }) {
    return `like ${like} and dislike ${dislike}`;
  }

  return (
    <>
      <h2>People</h2>
      <button
        disabled={name === "Sara"}
        type="button"
        onClick={() => {
          setName("Sara");
        }}
      >
        Name includes Sara
      </button>
      <button
        disabled={name === "John"}
        type="button"
        onClick={() => {
          setName("John");
        }}
      >
        Name includes John
      </button>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {data?.people.map((person) => (
            <li key={person.id}>
              {person.name} ({person.age}),{" "}
              {renderPreference(person.preference)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function App() {
  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      <nav>
        <Link to="/">People name only</Link> |{" "}
        <Link to="/peopleAll">People</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="peopleAll" element={<PeopleAll />} />
      </Routes>
    </main>
  );
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

render(
  <ApolloProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ApolloProvider>,
  document.getElementById("root")
);
